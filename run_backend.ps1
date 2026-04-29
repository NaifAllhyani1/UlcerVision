# ============================================================
#  UlcerVision — Backend Launcher (PowerShell)
#  Starts the FastAPI model server on http://localhost:8000
# ============================================================

$Host.UI.RawUI.WindowTitle = "UlcerVision Backend Server"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║       UlcerVision — Backend Launcher         ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# --- Configuration ---
$BackendDir   = Join-Path $PSScriptRoot "backend"
$VenvDir      = Join-Path $BackendDir ".venv"
$ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
$RequirementsFile = Join-Path $BackendDir "requirements.txt"
$WeightsFile  = Join-Path $BackendDir "tiny-swin with zero-shot.pt"
$Host_        = "0.0.0.0"
$Port         = 8000

# --- Validate backend directory ---
if (-not (Test-Path $BackendDir)) {
    Write-Host "[ERROR] Backend directory not found: $BackendDir" -ForegroundColor Red
    Write-Host "        Make sure you run this script from the project root." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# --- Validate weights file ---
if (-not (Test-Path $WeightsFile)) {
    Write-Host "[WARNING] Model weights not found:" -ForegroundColor Yellow
    Write-Host "          $WeightsFile" -ForegroundColor Yellow
    Write-Host "          Server will start but predictions will fail." -ForegroundColor Yellow
    Write-Host ""
}
else {
    $sizeMB = [math]::Round((Get-Item $WeightsFile).Length / 1MB, 1)
    Write-Host "[INFO] Model weights found ($sizeMB MB)" -ForegroundColor Green
}

# --- Create venv if needed ---
if (-not (Test-Path $ActivateScript)) {
    Write-Host "[SETUP] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv $VenvDir
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create venv. Ensure Python 3.10+ is installed." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[SETUP] Virtual environment created." -ForegroundColor Green
    Write-Host ""
}

# --- Activate venv ---
Write-Host "[INFO] Activating virtual environment..." -ForegroundColor Cyan
& $ActivateScript

# --- Install dependencies ---
Write-Host "[INFO] Checking dependencies..." -ForegroundColor Cyan
pip install -r $RequirementsFile --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] pip install failed. Check requirements.txt." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[INFO] Dependencies are up to date." -ForegroundColor Green
Write-Host ""

# --- Set model weights env var ---
$env:MODEL_WEIGHTS = $WeightsFile

# --- Display server info ---
Write-Host "══════════════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host "  Starting FastAPI server..." -ForegroundColor White
Write-Host "  URL:      " -NoNewline; Write-Host "http://localhost:$Port" -ForegroundColor Green
Write-Host "  Docs:     " -NoNewline; Write-Host "http://localhost:$Port/docs" -ForegroundColor Green
Write-Host "  Health:   " -NoNewline; Write-Host "http://localhost:$Port/health" -ForegroundColor Green
Write-Host "  Weights:  " -NoNewline; Write-Host (Split-Path $WeightsFile -Leaf) -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor DarkGray
Write-Host ""

# --- Start uvicorn ---
Set-Location $BackendDir
uvicorn main:app --host $Host_ --port $Port --reload

# --- Server stopped ---
Write-Host ""
Write-Host "[INFO] Server stopped." -ForegroundColor Yellow
Read-Host "Press Enter to exit"
