from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import register
from routers import register, admin, onboard, profile, nfc, tasks, feedback, vault

app = FastAPI(
    title="CSDC Synapse API",
    description="Chathurya Student Developers Club — Backend API",
    version="0.1.0",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(register.router)

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "csdc-synapse-api"}

app.include_router(admin.router) 
app.include_router(onboard.router)
app.include_router(profile.router)
app.include_router(nfc.router)
app.include_router(tasks.router)
app.include_router(feedback.router)
app.include_router(vault.router)