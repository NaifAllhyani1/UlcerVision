# FastAPI Backend (Image Classification)

## Structure

```text
backend/
  main.py
  model.py
  best_model.pt
  utils.py
  requirements.txt
```

## 1) Install

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) Put your real artifacts

- Keep `backend/model.py` as the DFU Zero-Shot architecture (Swin-Tiny + CLIP).
- Ensure `backend/best_model.pt` exists and matches that architecture.

## 3) Optional environment variables

- `MODEL_WEIGHTS` (default: `backend/best_model.pt`)

## 4) Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 5) API

### POST `/predict`

`multipart/form-data`, file key `file` (also accepts `image`).

Response:

```json
{
  "prediction": "none",
  "confidence": 0.93,
  "probabilities": {
    "none": 0.93,
    "infection": 0.03,
    "ischemia": 0.02,
    "both": 0.02
  },
  "logits": [2.14, 0.11, -0.32, -0.54],
  "max_similarity": 0.41,
  "is_ood": false
}
```

### GET `/health`

Returns model readiness and startup error (if any).
