#!/usr/bin/env bash
# ============================================================
#  UlcerVision — Backend Launcher (macOS / Linux)
#  Starts the FastAPI model server on http://localhost:8000
# ============================================================

set -euo pipefail

# ---- Configuration -----------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"
HOST="0.0.0.0"
PORT="8000"
WEIGHTS_FILE="$BACKEND_DIR/model/model.pt"

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║       UlcerVision — Backend Launcher         ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# ---- Check backend directory exists ------------------------
if [ ! -d "$BACKEND_DIR" ]; then
    echo "[ERROR] Backend directory not found: $BACKEND_DIR"
    echo "        Make sure you run this script from the project root."
    exit 1
fi

# ---- Check weights file exists (non-fatal warning) ---------
if [ ! -f "$WEIGHTS_FILE" ]; then
    echo "[WARNING] Model weights not found at:"
    echo "          $WEIGHTS_FILE"
    echo "          The server will start but predictions will fail."
    echo ""
fi

# ---- Create virtual environment if it doesn't exist --------
if [ ! -f "$VENV_DIR/bin/activate" ]; then
    echo "[SETUP] Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo "[SETUP] Virtual environment created."
    echo ""
fi

# ---- Activate virtual environment --------------------------
echo "[INFO] Activating virtual environment..."
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# ---- Install / update dependencies -------------------------
echo "[INFO] Installing dependencies (this may take a moment on first run)..."
pip install -r "$BACKEND_DIR/requirements.txt" --quiet
echo "[INFO] Dependencies are up to date."
echo ""

# ---- Set MODEL_PATH env variable ---------------------------
export MODEL_PATH="$WEIGHTS_FILE"

# ---- Start the server --------------------------------------
echo "══════════════════════════════════════════════════"
echo " Starting FastAPI server..."
echo " URL:      http://localhost:$PORT"
echo " Docs:     http://localhost:$PORT/docs"
echo " Health:   http://localhost:$PORT/health"
echo " Weights:  $WEIGHTS_FILE"
echo "══════════════════════════════════════════════════"
echo ""
echo " Press Ctrl+C to stop the server."
echo ""

cd "$BACKEND_DIR"
uvicorn main:app --host "$HOST" --port "$PORT" --reload

# ---- Server stopped ----------------------------------------
echo ""
echo "[INFO] Server stopped."
