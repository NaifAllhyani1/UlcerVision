import io
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, UnidentifiedImageError
from transformers import AutoImageProcessor, CLIPTokenizer

from model import (
    CLASS_DESCRIPTIONS,
    CLASS_NAMES,
    CLIP_MODEL,
    EMBED_DIM,
    FREEZE_SWIN_STAGES,
    SWIN_MODEL,
    DFUZeroShotModel,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-classification-api")

load_dotenv(Path(__file__).parent / ".env")

BASE_DIR = Path(__file__).parent
model_path = os.environ.get("MODEL_PATH", str(BASE_DIR / "model" / "model.pt"))
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ---------------------------------------------------------------------------
# Application state
# ---------------------------------------------------------------------------

class AppState:
    model: DFUZeroShotModel | None = None
    image_processor: AutoImageProcessor | None = None
    text_input_ids: torch.Tensor | None = None
    text_attention_mask: torch.Tensor | None = None
    load_error: str | None = None
    loaded: bool = False


state = AppState()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    weights_file: str
    error: str | None = None


class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: dict[str, float]
    is_ood: bool


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------

def startup_load_model() -> None:
    weights = Path(model_path)
    logger.info("Loading model weights from %s", weights)

    if not weights.exists():
        raise FileNotFoundError(f"Weights file not found: {weights}")

    ckpt = torch.load(weights, map_location=device)
    model = DFUZeroShotModel(SWIN_MODEL, CLIP_MODEL, EMBED_DIM, FREEZE_SWIN_STAGES)
    model.load_state_dict(ckpt, strict=True)
    model.eval()
    model.to(device)

    image_processor = AutoImageProcessor.from_pretrained(SWIN_MODEL)
    tokenizer = CLIPTokenizer.from_pretrained(CLIP_MODEL)

    desc_list = [CLASS_DESCRIPTIONS[c] for c in CLASS_NAMES]
    text_inputs = tokenizer(
        desc_list, padding=True, truncation=True, max_length=77, return_tensors="pt"
    )

    state.model = model
    state.image_processor = image_processor
    state.text_input_ids = text_inputs["input_ids"].to(device)
    state.text_attention_mask = text_inputs["attention_mask"].to(device)
    state.load_error = None
    state.loaded = True

    logger.info("Model loaded successfully on %s", device)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        startup_load_model()
    except Exception as exc:  # keep server alive for /health diagnostics
        state.loaded = False
        state.load_error = str(exc)
        logger.exception("Model failed to load at startup: %s", exc)
    yield


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="DFU Zero-Shot Classification API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok" if state.loaded else "error",
        model_loaded=state.loaded,
        device=str(device),
        weights_file=model_path,
        error=state.load_error,
    )


@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    """Classify a DFU image. Accepts multipart/form-data with field 'file'."""
    if not state.loaded or state.model is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not ready: {state.load_error or 'not loaded'}",
        )

    # --- Load image ---
    try:
        raw = await file.read()
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read image: {exc}") from exc

    # --- Preprocess ---
    inputs = state.image_processor(images=image, return_tensors="pt")
    pixel_values = inputs["pixel_values"].to(device)

    # --- Inference ---
    with torch.no_grad():
        preds, names = state.model.predict(
            pixel_values, state.text_input_ids, state.text_attention_mask
        )

        # Compute cosine similarities for confidence + OOD
        img_emb = state.model.encode_image(pixel_values)
        txt_embs = state.model.encode_text(state.text_input_ids, state.text_attention_mask)
        cos_sims = (img_emb @ txt_embs.T).squeeze(0)   # (4,)
        max_sim = float(cos_sims.max().item())

        scale = state.model.logit_scale.exp().clamp(max=100)
        logits = scale * cos_sims
        probs = torch.softmax(logits, dim=0)

        conf, idx = torch.max(probs, dim=0)
        pred_name = CLASS_NAMES[int(idx.item())]
        probs_cpu = probs.detach().cpu().tolist()
        prob_map = {name: float(p) for name, p in zip(CLASS_NAMES, probs_cpu)}
        is_ood = max_sim < 0.20

    logger.info(
        "Prediction: %s  conf=%.4f  max_sim=%.4f  is_ood=%s",
        pred_name, float(conf.item()), max_sim, is_ood,
    )

    return PredictResponse(
        prediction=pred_name,
        confidence=float(conf.item()),
        probabilities=prob_map,
        is_ood=is_ood,
    )
