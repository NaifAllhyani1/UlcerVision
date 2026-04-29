"""
DFU Predict — FastAPI Inference Server
=======================================
Serves the DFUZeroShotModel (Swin Transformer + CLIP text encoder).
Exposes:
  POST /predict      — run inference on an uploaded foot image
  GET  /health       — liveness check
  POST /reload-model — hot-reload weights (called by Next.js admin panel)

Run:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import io
import os
import logging
import numpy as np
from pathlib import Path
from contextlib import asynccontextmanager

import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from transformers import (
    SwinModel,
    AutoImageProcessor,
    CLIPTextModel,
    CLIPTokenizer,
)

# ─────────────────────────── CONFIG ───────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dfu-api")

SWIN_MODEL  = "microsoft/swin-base-patch4-window7-224"
CLIP_MODEL  = "openai/clip-vit-base-patch32"
EMBED_DIM   = 256
DEVICE      = "cuda" if torch.cuda.is_available() else "cpu"

# Path to your trained weights — place best_model.pt in the same folder as main.py
WEIGHTS_PATH = Path(os.getenv("MODEL_WEIGHTS", "best_model.pt"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "1.2.0")

CLASS_NAMES = ["none", "infection", "ischemia", "both"]

CLASS_DESCRIPTIONS = {
    "none": (
        "A diabetic foot wound with normal pink color, no visible exudate or pus, "
        "normal moisture level, well-defined and regular wound margins, "
        "superficial or minimal depth. The wound shows healthy tissue appearance "
        "without signs of infection or ischemia."
    ),
    "infection": (
        "A diabetic foot wound with bright red or yellow color and visible pus. "
        "Visible exudate that is yellow, green, or purulent. "
        "Moist or shiny wound surface. Swollen and irregular wound margins. "
        "The wound may appear deep with exposed tissue and signs of bacterial infection."
    ),
    "ischemia": (
        "A diabetic foot wound with pale white, bluish, or dry black discoloration "
        "indicating poor blood supply. No visible exudate. "
        "Completely dry wound surface. Thin, dry, and contracted wound margins. "
        "Often deep and dry wound, indicating tissue necrosis due to ischemia."
    ),
    "both": (
        "A diabetic foot wound showing signs of both infection and ischemia. "
        "Black areas combined with yellow exudate. "
        "Mixed moist and dry regions on the wound surface. "
        "Darkened or irregular margins with swelling. "
        "Deep wound with exudate, showing simultaneous ischemic and infectious features."
    ),
}

# ─────────────────────────── MODEL ARCHITECTURE ───────────────────────────────
# Must match exactly what was used during training

class SwinImageEncoder(nn.Module):
    def __init__(self, swin_name, embed_dim):
        super().__init__()
        self.swin = SwinModel.from_pretrained(swin_name)
        swin_hidden = self.swin.config.hidden_size  # 1024 for swin-base
        self.proj = nn.Sequential(
            nn.Linear(swin_hidden, embed_dim * 2),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(embed_dim * 2, embed_dim),
        )

    def forward(self, pixel_values):
        outputs = self.swin(pixel_values=pixel_values)
        pooled = outputs.last_hidden_state.mean(dim=1)
        return self.proj(pooled)


class CLIPTextEncoder(nn.Module):
    def __init__(self, clip_name, embed_dim):
        super().__init__()
        self.text_model = CLIPTextModel.from_pretrained(clip_name)
        clip_hidden = self.text_model.config.hidden_size  # 512
        self.proj = nn.Sequential(
            nn.Linear(clip_hidden, embed_dim * 2),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(embed_dim * 2, embed_dim),
        )

    def forward(self, input_ids, attention_mask):
        outputs = self.text_model(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.pooler_output
        return self.proj(pooled)


class DFUZeroShotModel(nn.Module):
    def __init__(self, swin_name, clip_name, embed_dim, num_classes=4):
        super().__init__()
        self.image_encoder = SwinImageEncoder(swin_name, embed_dim)
        self.text_encoder = CLIPTextEncoder(clip_name, embed_dim)
        self.logit_scale = nn.Parameter(torch.ones([]) * np.log(1 / 0.07))
        self.num_classes = num_classes

    def encode_image(self, pixel_values):
        emb = self.image_encoder(pixel_values)
        return F.normalize(emb, dim=-1)

    def encode_text(self, input_ids, attention_mask):
        emb = self.text_encoder(input_ids, attention_mask)
        return F.normalize(emb, dim=-1)

    def forward(self, pixel_values, text_input_ids, text_attention_masks):
        img_emb = self.encode_image(pixel_values)
        txt_embs = self.encode_text(text_input_ids, text_attention_masks)
        scale = self.logit_scale.exp().clamp(max=100)
        logits = scale * img_emb @ txt_embs.T
        return logits


# ─────────────────────────── MODEL STATE (singleton) ──────────────────────────

class ModelState:
    """Holds the loaded model and preprocessors as a singleton."""
    model: DFUZeroShotModel = None
    image_processor: AutoImageProcessor = None
    text_inputs: dict = None
    loaded: bool = False
    version: str = MODEL_VERSION


state = ModelState()


def load_model(weights_path: Path = WEIGHTS_PATH):
    """Load or reload the model from disk."""
    logger.info(f"Loading model from {weights_path} on {DEVICE} ...")

    image_processor = AutoImageProcessor.from_pretrained(SWIN_MODEL)
    tokenizer = CLIPTokenizer.from_pretrained(CLIP_MODEL)

    desc_list = [CLASS_DESCRIPTIONS[c] for c in CLASS_NAMES]
    text_inputs = tokenizer(
        desc_list,
        padding=True,
        truncation=True,
        max_length=77,
        return_tensors="pt",
    )
    # Pre-move text tensors to device — they never change between requests
    text_inputs = {k: v.to(DEVICE) for k, v in text_inputs.items()}

    model = DFUZeroShotModel(SWIN_MODEL, CLIP_MODEL, EMBED_DIM).to(DEVICE)

    if weights_path.exists():
        state_dict = torch.load(weights_path, map_location=DEVICE)
        model.load_state_dict(state_dict)
        logger.info("Weights loaded successfully.")
    else:
        logger.warning(
            f"Weights file not found at {weights_path}. "
            "Running with random weights — predictions will be meaningless!"
        )

    model.eval()

    state.model = model
    state.image_processor = image_processor
    state.text_inputs = text_inputs
    state.loaded = True
    logger.info("Model ready.")


# ─────────────────────────── LIFESPAN ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield
    logger.info("Shutting down.")


# ─────────────────────────── APP ──────────────────────────────────────────────

app = FastAPI(
    title="DFU Predict API",
    description="Diabetic Foot Ulcer detection via Swin-Transformer + CLIP zero-shot model.",
    version=MODEL_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # your Next.js dev URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────── RESPONSE SCHEMAS ─────────────────────────────────

class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: dict[str, float]
    model_version: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str
    device: str


class ReloadResponse(BaseModel):
    status: str
    model_version: str


# ─────────────────────────── INFERENCE HELPER ─────────────────────────────────

@torch.no_grad()
def run_inference(image: Image.Image) -> PredictResponse:
    """Run the model on a PIL image and return structured results."""
    if not state.loaded:
        raise HTTPException(status_code=503, detail="Model not loaded yet.")

    # Preprocess image
    inputs = state.image_processor(images=image, return_tensors="pt")
    pixel_values = inputs["pixel_values"].to(DEVICE)  # (1, 3, 224, 224)

    # Forward pass
    logits = state.model(
        pixel_values,
        state.text_inputs["input_ids"],
        state.text_inputs["attention_mask"],
    )  # (1, 4)

    probs = F.softmax(logits, dim=-1).squeeze(0).cpu().tolist()  # [4]

    pred_idx = int(np.argmax(probs))
    prediction = CLASS_NAMES[pred_idx]
    confidence = round(probs[pred_idx], 4)
    probabilities = {cls: round(p, 4) for cls, p in zip(CLASS_NAMES, probs)}

    return PredictResponse(
        prediction=prediction,
        confidence=confidence,
        probabilities=probabilities,
        model_version=state.version,
    )


# ─────────────────────────── ROUTES ───────────────────────────────────────────

@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    """
    Accept a foot image, run zero-shot classification.

    Returns:
      - prediction   : top predicted class (none | infection | ischemia | both)
      - confidence   : probability of the top class (0.0 – 1.0)
      - probabilities: all 4 class probabilities
      - model_version: active model version string
    """
    # Validate file type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type: {file.content_type}. Use JPEG or PNG.",
        )

    # Read and decode image
    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {e}")

    logger.info(f"Received image: {file.filename} ({file.content_type}, {len(contents)} bytes)")

    result = run_inference(image)
    logger.info(f"Prediction: {result.prediction} ({result.confidence:.2%})")

    return result


@app.get("/health", response_model=HealthResponse)
async def health():
    """Liveness + readiness check. Called by Next.js admin dashboard."""
    return HealthResponse(
        status="ok" if state.loaded else "loading",
        model_loaded=state.loaded,
        model_version=state.version,
        device=DEVICE,
    )


@app.post("/reload-model", response_model=ReloadResponse)
async def reload_model(weights_path: str = str(WEIGHTS_PATH)):
    """
    Hot-reload model weights from disk.
    Called by Next.js POST /api/admin/model after admin uploads a new artifact.
    """
    try:
        load_model(Path(weights_path))
        return ReloadResponse(status="reloaded", model_version=state.version)
    except Exception as e:
        logger.error(f"Reload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Reload failed: {e}")