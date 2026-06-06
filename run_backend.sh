#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"
if [ ! -f "$VENV_DIR/bin/python" ]; then
  python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
pip install -r "$BACKEND_DIR/requirements.txt" -q
export MODEL_PATH="$BACKEND_DIR/model/model.pt"
cd "$BACKEND_DIR"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
