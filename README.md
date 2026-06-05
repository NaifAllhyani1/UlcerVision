# UlcerVision

**AI-powered Diabetic Foot Ulcer (DFU) detection and classification system.**

UlcerVision helps healthcare professionals detect and classify Diabetic Foot Ulcers from plantar foot images using a zero-shot deep learning model. The system classifies ulcers into four categories — **None**, **Infection**, **Ischemia**, or **Both** — and provides clinical triage recommendations based on the prediction.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [How It Works](#how-it-works)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Deployment Notes](#deployment-notes)

---

## Features

- **AI-Powered Classification** — Upload a foot image and receive an instant prediction with confidence score
- **Zero-Shot Model** — Swin Transformer (image encoder) + CLIP (text encoder) architecture for robust classification
- **Out-of-Distribution Detection** — Flags images that don't match known DFU patterns
- **Clinical Triage** — Automated risk assessment (High / Medium / Low) with action recommendations
- **User Authentication** — JWT-based login/registration with role-based access control
- **Admin Dashboard** — View stats, manage users, and browse scan logs
- **Bilingual UI** — Full English and Arabic language support
- **Dark Mode** — Light/dark theme toggle with system preference detection
- **Scan History** — Users can review all previous scans and results
- **SQLite Database** — Lightweight, zero-configuration database for users, scans, and results

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                        │
│                     Next.js Pages (React)                      │
│              pages/index.tsx — SPA with all views               │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                           │
│   app/api/auth/*    — login, register, logout, me              │
│   app/api/scans/*   — upload image, list scans                 │
│   app/api/admin/*   — stats, users, logs, model                │
│                                                                │
│   lib/db.js         — SQLite via better-sqlite3                │
│   lib/auth.js       — JWT verification                         │
│   lib/fastapi.js    — Proxy to Python backend                  │
│   middleware.js     — Admin route protection                   │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP (localhost:8000)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (Python)                       │
│   backend/main.py   — /predict and /health endpoints           │
│   backend/model.py  — DFUZeroShotModel architecture            │
│   backend/*.pt      — Trained model weights (~365 MB)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14** | React framework with API routes |
| **React 18** | UI rendering |
| **TypeScript** | Type safety |
| **Tailwind CSS 3** | Styling |
| **better-sqlite3** | Embedded SQLite database |
| **jose** | JWT authentication |
| **bcryptjs** | Password hashing |

### Backend (AI Model Server)
| Technology | Purpose |
|---|---|
| **FastAPI** | Python REST API framework |
| **PyTorch** | Deep learning framework |
| **Transformers (HuggingFace)** | Pre-trained Swin & CLIP models |
| **Uvicorn** | ASGI server |
| **Pillow** | Image processing |

---

## Project Structure

```
UlcerVision/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── login/route.js
│   │   │   ├── register/route.js
│   │   │   ├── logout/route.js
│   │   │   └── me/route.js
│   │   ├── scans/                # Scan management
│   │   │   ├── route.js          # GET: list user scans
│   │   │   ├── upload/route.js   # POST: upload & predict
│   │   │   └── [id]/route.js     # GET: single scan
│   │   └── admin/                # Admin-only endpoints
│   │       ├── stats/route.js
│   │       ├── users/route.js
│   │       ├── logs/route.js
│   │       └── model/route.js
│   ├── admin/                    # Admin page
│   ├── home/                     # Home page
│   └── login/                    # Login page
│
├── pages/                        # Next.js Pages Router
│   └── index.tsx                 # Main SPA (auth, home, admin, about)
│
├── backend/                      # Python AI model server
│   ├── main.py                   # FastAPI app with /predict & /health
│   ├── model.py                  # DFUZeroShotModel (Swin-Tiny + CLIP)
│   ├── utils.py                  # Image transforms & model loading utils
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Template — copy to .env and set MODEL_PATH
│   ├── .venv/                    # Python virtual environment (local, git-ignored)
│   └── model/                    # Weights directory (tracked, *.pt git-ignored)
│       ├── .gitkeep              # Keeps directory in Git
│       └── model.pt              # Trained weights (~365 MB) — not in repo
│
├── lib/                          # Shared utilities
│   ├── api.ts                    # Frontend API client
│   ├── fastapi.js                # Backend proxy (Next.js → FastAPI)
│   ├── db.js                     # SQLite setup & migrations
│   ├── auth.js                   # JWT verification helper
│   └── admin-auth.js             # Admin authorization
│
├── database/                     # SQLite database file
│   └── dfu_predict.db            # Auto-created on first run
│
├── public/uploads/               # User-uploaded images
├── styles/                       # CSS styles
├── middleware.js                  # Route protection (admin pages)
│
├── run_backend.bat               # One-click backend launcher (Windows CMD)
├── run_backend.ps1               # Backend launcher (Windows PowerShell)
├── run_backend.sh                # Backend launcher (macOS / Linux)
├── package.json                  # Node.js dependencies & scripts
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── next.config.mjs               # Next.js configuration
```

---

## Prerequisites

- **Node.js** ≥ 18.x
- **Python** ≥ 3.10
- **pip** (Python package manager)
- **Git**

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/UlcerVision.git
cd UlcerVision
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Set up the Python backend

```bash
# From the project root:
cd backend
python3 -m venv .venv          # use 'python' on Windows if 'python3' is not found

# Activate the virtual environment:
#   Windows (CMD / PowerShell)
.venv\Scripts\activate
#   macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 4. Copy the environment file

```bash
# From the project root:
cp backend/.env.example backend/.env    # macOS / Linux
copy backend\.env.example backend\.env  # Windows CMD
```

The default value (`MODEL_PATH=model/model.pt`) works without changes as long as you place the weights at `backend/model/model.pt` (step 5).

### 5. Place the model weights file

The trained weights file (~365 MB) is **not included in the repository** because it is too large for Git.

1. Obtain `model.pt` from the project team or the shared storage link.
2. Place it at `backend/model/model.pt` (the directory already exists in the repo).

> **Note**: See [Deployment Notes](#deployment-notes) for Git LFS and external storage options.

---

## Running the Application

### Recommended — run everything in one command

From the project root:

```bash
npm run dev:all
```

*Uses `concurrently` to launch the Next.js frontend on port 3000 and the FastAPI backend on port 8000 in a single terminal window.*

> **macOS / Linux users:** `npm run dev:all` uses a Windows-style venv path for the backend script. For the backend, use `./run_backend.sh` in a separate terminal instead, then run `npm run dev` for the frontend.

### Alternative Options

<details>
<summary>Click to view manual or separate startup methods</summary>

**Option A: Separate npm scripts**
```bash
# Start backend only
npm run backend

# Start frontend only
npm run dev
```

**Option B: One-click scripts**
- **Windows (CMD):** `run_backend.bat`
- **Windows (PowerShell):** `.\run_backend.ps1`
- **macOS / Linux:** `./run_backend.sh` *(auto-creates venv, installs requirements, sets MODEL_PATH)*

Then in a separate terminal: `npm run dev`

**Option C: Fully Manual**

Terminal 1 — Backend:
```bash
cd backend
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 — Frontend:
```bash
npm run dev
```
</details>

### Access the application

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Backend API Docs** | http://localhost:8000/docs |
| **Backend Health Check** | http://localhost:8000/health |

---

## Verification

After starting the backend, open **http://localhost:8000/health** in your browser. You should see a JSON response like:

```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cpu",
  "weights_file": "backend/model/model.pt",
  "error": null
}
```

Confirm **both** of the following:

1. `model_loaded` is `true` — if it is `false`, the weights file was not found or failed to load.
2. `weights_file` does **not** contain anyone's personal machine path (e.g., `C:\Users\YourName\...` or `/home/yourname/...`). If it does, the `MODEL_PATH` environment variable is not being read correctly — make sure you copied `backend/.env.example` to `backend/.env` and that it contains `MODEL_PATH=model/model.pt`.

---

## API Reference

### FastAPI Backend (port 8000)

#### `POST /predict`
Classify a DFU image.

**Request:** `multipart/form-data` with field `file` (JPEG/PNG image)

**Response:**
```json
{
  "prediction": "infection",
  "confidence": 0.89,
  "probabilities": {
    "none": 0.05,
    "infection": 0.89,
    "ischemia": 0.03,
    "both": 0.03
  },
  "logits": [0.11, 2.14, -0.32, -0.54],
  "max_similarity": 0.41,
  "is_ood": false
}
```

#### `GET /health`
Check model status and server health.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cpu",
  "weights_file": "backend/model/model.pt",
  "error": null
}
```

### Next.js API Routes (port 3000)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT cookie |
| `POST` | `/api/auth/logout` | Clear auth cookie |
| `GET` | `/api/auth/me` | Get current user info |
| `POST` | `/api/scans/upload` | Upload image → save → predict → store result |
| `GET` | `/api/scans` | List current user's scan history |
| `GET` | `/api/admin/stats` | Dashboard statistics (admin only) |
| `GET` | `/api/admin/users` | List all users (admin only) |
| `DELETE` | `/api/admin/users/:id` | Delete a user (admin only) |
| `GET` | `/api/admin/logs` | All scan activity logs (admin only) |

---

## How It Works

### Model Architecture

The system uses a **DFUZeroShotModel** — a dual-encoder architecture combining:

1. **Swin-Tiny Transformer** (`microsoft/swin-tiny-patch4-window7-224`) — Encodes the uploaded foot image into a 128-dimensional embedding
2. **CLIP Text Encoder** (`openai/clip-vit-base-patch32`) — Encodes medical text descriptions for each class into the same embedding space

The model computes cosine similarity between the image embedding and each class description embedding, then applies a learned temperature scaling to produce logits.

### Classification Classes

| Class | Description |
|---|---|
| `none` | Healthy wound with no signs of infection or ischemia |
| `infection` | Signs of bacterial infection (pus, swelling, redness) |
| `ischemia` | Poor blood supply (pale, dry, necrotic tissue) |
| `both` | Combined infection and ischemia |

### Out-of-Distribution (OOD) Detection

If the maximum cosine similarity between the image and all class descriptions falls below **0.20**, the image is flagged as out-of-distribution (not a recognizable DFU image), and the prediction defaults to `none`.

### Prediction Flow

```
User uploads image
       │
       ▼
Next.js API (/api/scans/upload)
  ├── Saves image to public/uploads/
  ├── Creates scan record in SQLite
  ├── Forwards image to FastAPI /predict
  │         │
  │         ▼
  │    FastAPI Backend
  │    ├── Preprocesses image (224×224, normalize)
  │    ├── Encodes image with Swin Transformer
  │    ├── Computes similarity with class descriptions
  │    ├── Checks OOD threshold
  │    └── Returns prediction + confidence + probabilities
  │         │
  │         ▼
  ├── Stores result in scan_results table
  ├── Creates notification
  └── Returns response to frontend
       │
       ▼
Frontend (lib/api.ts)
  ├── Receives: prediction + confidence
  ├── Calculates risk level (High/Medium/Low)
  │     • "both" + conf ≥ 0.70 → High
  │     • "infection"/"ischemia" + conf ≥ 0.75 → High
  │     • "none" + conf ≥ 0.80 → Medium, else Low
  └── Maps risk to clinical recommendation text
```

### Clinical Triage (Frontend Rules)

| Risk Level | Recommendation |
|---|---|
| **High** | Urgent referral to multidisciplinary foot team within 24 hours. Offload pressure and assess for severe infection/ischemia. |
| **Medium** | Arrange specialist podiatry review within 1 week. Optimize offloading and wound care. |
| **Low** | Continue routine surveillance and educate the patient on warning signs. |

> **Important:** The risk level and recommendation text are rule-based (not AI-generated). Only the prediction class and confidence come from the model.

---

## Database Schema

The application uses **SQLite** (via `better-sqlite3`). The database is automatically created and migrated on first run.

```sql
-- User accounts
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user','admin')) DEFAULT 'user',
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded scans
CREATE TABLE scans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_path  TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('pending','done')) DEFAULT 'pending',
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AI prediction results
CREATE TABLE scan_results (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id           INTEGER NOT NULL UNIQUE REFERENCES scans(id) ON DELETE CASCADE,
  prediction        TEXT NOT NULL,
  confidence        REAL NOT NULL,
  raw_probabilities TEXT NOT NULL,  -- JSON string
  model_version     TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User notifications
CREATE TABLE notifications (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Model registry (admin)
CREATE TABLE model_registry (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  version       TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('serving','inactive')) DEFAULT 'inactive',
  architecture  TEXT NOT NULL,
  artifact_path TEXT NOT NULL,
  auroc         REAL NOT NULL,
  uploaded_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `dev-only-change-this-secret` | Secret key for JWT token signing |
| `MODEL_PATH` | `model/model.pt` | Path to model weights file (configured in `backend/.env`) |
| `FASTAPI_URL` | `http://localhost:8000` | URL of the Python backend |
| `NODE_ENV` | `development` | Node environment |

Create a `.env.local` file in the project root for production:
```env
JWT_SECRET=your-secure-random-secret-here
FASTAPI_URL=http://localhost:8000
```

---

## Deployment Notes

### Model Weights
The model weights file (~365 MB) is too large for standard Git. Options:
- **Git LFS** — `git lfs track "*.pt"` before committing
- **External storage** — Host on Google Drive, HuggingFace Hub, or S3 and download during setup
- **`.gitignore`** — The weights file should be listed in `.gitignore` and shared separately

### Production Considerations
- Set a strong `JWT_SECRET` environment variable
- Use HTTPS in production
- Restrict CORS origins in `backend/main.py`  
- Consider using a GPU server for faster inference
- Set up a reverse proxy (nginx) in front of both services

---

## License

This project was developed as a Graduation Design Project (GDP).
