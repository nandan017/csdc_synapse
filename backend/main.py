from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.limiter import limiter

app = FastAPI(
    title="CSDC Synapse API",
    description="Chathurya Student Developers Club — Backend API",
    version="0.1.0",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

# ── Rate Limiter ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = [settings.frontend_url]
if settings.environment == "development":
    origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routers import register, admin, onboard, profile, nfc, tasks, feedback, vault
from routers import auth, connect, activity

app.include_router(register.router)
app.include_router(admin.router)
app.include_router(onboard.router)
app.include_router(profile.router)
app.include_router(nfc.router)
app.include_router(tasks.router)
app.include_router(feedback.router)
app.include_router(vault.router)
app.include_router(auth.router)
app.include_router(connect.router)
app.include_router(activity.router)

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "csdc-synapse-api"}