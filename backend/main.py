import io
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, UnidentifiedImageError
from transformers import AutoImageProcessor, CLIPTokenizer

from model import (
    CLASS_DESCRIPTIONS,
    CLASS_NAMES,
    CLIP_MODEL,
    SWIN_MODEL,
    create_model,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-classification-api")

BASE_DIR = Path(__file__).resolve().parent
WEIGHTS_FILE = Path(os.getenv("MODEL_PATH", BASE_DIR / "model" / "model.pt"))
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def resolve_state_dict(checkpoint: Any) -> dict[str, torch.Tensor]:
    if isinstance(checkpoint, dict):
        for key in ("state_dict", "model_state_dict", "model"):
            nested = checkpoint.get(key)
            if isinstance(nested, dict):
                return nested
        if all(isinstance(k, str) for k in checkpoint.keys()):
            return checkpoint
    raise RuntimeError(
        "Could not resolve state_dict from checkpoint. "
        "Expected a state dict or a dict containing state_dict/model_state_dict/model."
    )


class AppState:
    model: torch.nn.Module | None = None
    image_processor: AutoImageProcessor | None = None
    tokenizer: CLIPTokenizer | None = None
    text_input_ids: torch.Tensor | None = None
    text_attention_mask: torch.Tensor | None = None
    load_error: str | None = None
    loaded: bool = False


state = AppState()


class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: dict[str, float]
    logits: list[float]
    max_similarity: float
    is_ood: bool


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    weights_file: str
    error: str | None = None


def startup_load_model() -> None:
    logger.info("Loading DFU zero-shot model weights=%s", WEIGHTS_FILE)
    model = create_model()
    if not WEIGHTS_FILE.exists():
        raise FileNotFoundError(f"Weights not found at {WEIGHTS_FILE}")

    checkpoint = torch.load(WEIGHTS_FILE, map_location=DEVICE)
    state_dict = resolve_state_dict(checkpoint)

    try:
        model.load_state_dict(state_dict, strict=True)
    except RuntimeError as exc:
        raise RuntimeError(
            f"Failed loading checkpoint into model (strict=True). "
            f"Check architecture/weights compatibility. Details: {exc}"
        ) from exc

    model.to(DEVICE)
    model.eval()

    image_processor = AutoImageProcessor.from_pretrained(SWIN_MODEL)
    tokenizer = CLIPTokenizer.from_pretrained(CLIP_MODEL)

    desc_list = [CLASS_DESCRIPTIONS[c] for c in CLASS_NAMES]
    text_inputs = tokenizer(desc_list, padding=True, truncation=True, max_length=77, return_tensors="pt")

    state.model = model
    state.image_processor = image_processor
    state.tokenizer = tokenizer
    state.text_input_ids = text_inputs["input_ids"].to(DEVICE)
    state.text_attention_mask = text_inputs["attention_mask"].to(DEVICE)
    state.load_error = None
    state.loaded = True

    logger.info("Model loaded successfully on %s", DEVICE)


@torch.no_grad()
def run_inference(img: Image.Image) -> PredictResponse:
    if (
        not state.loaded
        or state.model is None
        or state.image_processor is None
        or state.text_input_ids is None
        or state.text_attention_mask is None
    ):
        raise HTTPException(status_code=503, detail=f"Model not ready: {state.load_error or 'not loaded'}")

    pixel_values = state.image_processor(images=img, return_tensors="pt")["pixel_values"].to(DEVICE)

    # DFU class logits and softmax
    logits = state.model(pixel_values, state.text_input_ids, state.text_attention_mask)
    probs = torch.softmax(logits, dim=1).squeeze(0)
    conf, idx = torch.max(probs, dim=0)
    idx_int = int(idx.item())

    # Calculate cosine similarities for diagnostics
    img_emb = state.model.encode_image(pixel_values)
    dfu_embs = state.model.encode_text(state.text_input_ids, state.text_attention_mask)
    dfu_sims = (img_emb @ dfu_embs.T).squeeze(0)
    best_dfu_sim = float(dfu_sims.max().item())

    # OOD detection disabled for now until model is retrained to support it
    is_ood = False

    logger.info(
        "Prediction: max_softmax=%.4f, is_ood=%s, dfu_sims=%s",
        float(conf.item()), is_ood,
        {n: round(float(s), 4) for n, s in zip(CLASS_NAMES, dfu_sims.tolist())},
    )

    pred_name = CLASS_NAMES[idx_int]
    probs_cpu = probs.detach().cpu().tolist()
    logits_cpu = logits.squeeze(0).detach().cpu().tolist()
    prob_map = {name: float(p) for name, p in zip(CLASS_NAMES, probs_cpu)}

    return PredictResponse(
        prediction=pred_name,
        confidence=float(conf.item()),
        probabilities=prob_map,
        logits=[float(x) for x in logits_cpu],
        max_similarity=best_dfu_sim,
        is_ood=is_ood,
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        startup_load_model()
    except Exception as exc:  # keep server alive for /health diagnostics
        state.loaded = False
        state.load_error = str(exc)
        logger.exception("Model failed to load at startup: %s", exc)
    yield


app = FastAPI(
    title="DFU Zero-Shot Classification API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok" if state.loaded else "error",
        model_loaded=state.loaded,
        device=str(DEVICE),
        weights_file=str(WEIGHTS_FILE),
        error=state.load_error,
    )


@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile | None = File(default=None), image: UploadFile | None = File(default=None)):
    """
    Accept multipart/form-data image upload.
    Frontend key compatibility:
    - preferred: file
    - also supports: image
    """
    upload = file or image
    if upload is None:
        raise HTTPException(status_code=422, detail="Missing upload file. Expected form-data key 'file'.")

    try:
        raw = await upload.read()
        pil = Image.open(io.BytesIO(raw)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image upload: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded image: {exc}") from exc

    return run_inference(pil)
