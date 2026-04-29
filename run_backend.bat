@echo off
REM ============================================================
REM  UlcerVision — Backend Launcher
REM  Starts the FastAPI model server on http://localhost:8000
REM ============================================================

title UlcerVision Backend Server

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║       UlcerVision — Backend Launcher         ║
echo  ╚══════════════════════════════════════════════╝
echo.

REM --- Configuration -----------------------------------------------
set "BACKEND_DIR=%~dp0backend"
set "VENV_DIR=%BACKEND_DIR%\.venv"
set "HOST=0.0.0.0"
set "PORT=8000"
set "WEIGHTS_FILE=%BACKEND_DIR%\tiny-swin with zero-shot.pt"

REM --- Check backend directory exists ------------------------------
if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found: %BACKEND_DIR%
    echo         Make sure you run this script from the project root.
    pause
    exit /b 1
)

REM --- Check weights file exists -----------------------------------
if not exist "%WEIGHTS_FILE%" (
    echo [WARNING] Model weights not found at:
    echo          %WEIGHTS_FILE%
    echo          The server will start but predictions will fail.
    echo.
)

REM --- Create virtual environment if it doesn't exist ---------------
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo [SETUP] Creating Python virtual environment...
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        echo         Make sure Python 3.10+ is installed and on your PATH.
        pause
        exit /b 1
    )
    echo [SETUP] Virtual environment created.
    echo.
)

REM --- Activate virtual environment --------------------------------
echo [INFO] Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"

REM --- Install / update dependencies --------------------------------
echo [INFO] Installing dependencies (this may take a moment on first run)...
pip install -r "%BACKEND_DIR%\requirements.txt" --quiet
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies. Check requirements.txt.
    pause
    exit /b 1
)
echo [INFO] Dependencies are up to date.
echo.

REM --- Set environment variable for model weights -------------------
set "MODEL_WEIGHTS=%WEIGHTS_FILE%"

REM --- Start the server --------------------------------------------
echo ══════════════════════════════════════════════════
echo  Starting FastAPI server...
echo  URL:      http://localhost:%PORT%
echo  Docs:     http://localhost:%PORT%/docs
echo  Health:   http://localhost:%PORT%/health
echo  Weights:  %WEIGHTS_FILE%
echo ══════════════════════════════════════════════════
echo.
echo  Press Ctrl+C to stop the server.
echo.

cd /d "%BACKEND_DIR%"
uvicorn main:app --host %HOST% --port %PORT% --reload

REM --- If we get here, the server stopped --------------------------
echo.
echo [INFO] Server stopped.
pause
