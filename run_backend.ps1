# ============================================================
#  UlcerVision - Backend Launcher (PowerShell)
#  Starts the FastAPI model server on http://localhost:8000
# ============================================================

$Host.UI.RawUI.WindowTitle = "UlcerVision Backend Server"

Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Cyan
Write-Host "  |       UlcerVision - Backend Launcher        |" -ForegroundColor Cyan
Write-Host "  +=============================================+" -ForegroundColor Cyan
Write-Host ""

# --- Configuration ---
$BackendDir = Join-Path $PSScriptRoot "backend"
$VenvDir = Join-Path $BackendDir ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$RequirementsFile = Join-Path $BackendDir "requirements.txt"
$WeightsFile = Join-Path $BackendDir "model\model.pt"
$HostAddr = "0.0.0.0"
$Port = 8000

# --- Validate backend directory ---
if (-not (Test-Path $BackendDir)) {
    Write-Host "[ERROR] Backend directory not found: $BackendDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# --- Validate weights file ---
if (-not (Test-Path $WeightsFile)) {
    Write-Host "[WARN] Model weights not found" -ForegroundColor Yellow
    Write-Host "       $WeightsFile" -ForegroundColor Yellow
    Write-Host "       Server will start but predictions will fail." -ForegroundColor Yellow
    Write-Host ""
}
else {
    $sizeVal = [math]::Round((Get-Item $WeightsFile).Length / 1048576, 1)
    Write-Host "[OK] Model weights found ($sizeVal megabytes)" -ForegroundColor Green
}

# --- Create venv if needed ---
if (-not (Test-Path $VenvPython)) {
    Write-Host "[SETUP] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv $VenvDir
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create venv." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK] Virtual environment created." -ForegroundColor Green
    Write-Host ""
}

# --- Validate venv python ---
if (-not (Test-Path $VenvPython)) {
    Write-Host "[ERROR] Venv python not found: $VenvPython" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Using venv Python: $VenvPython" -ForegroundColor Cyan

# --- Install dependencies ---
Write-Host "[..] Checking dependencies..." -ForegroundColor Cyan
& $VenvPython -m pip install -r $RequirementsFile --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] pip install failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Dependencies are up to date." -ForegroundColor Green
Write-Host ""

# --- Set model weights env var ---
$env:MODEL_PATH = $WeightsFile

# --- Display server info ---
Write-Host "==================================================" -ForegroundColor DarkCyan
Write-Host "  Starting FastAPI server..." -ForegroundColor White
Write-Host "  URL:      http://localhost:$Port" -ForegroundColor Green
Write-Host "  Docs:     http://localhost:$Port/docs" -ForegroundColor Green
Write-Host "  Health:   http://localhost:$Port/health" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor DarkGray
Write-Host ""

# --- Start uvicorn ---
Set-Location $BackendDir
& $VenvPython -m uvicorn main:app --host $HostAddr --port $Port --reload

# --- Server stopped ---
Write-Host ""
Write-Host "[INFO] Server stopped." -ForegroundColor Yellow
Read-Host "Press Enter to exit"
