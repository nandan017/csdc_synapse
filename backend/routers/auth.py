import secrets
import hashlib
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from services.supabase_service import get_supabase
from services.crypto_service import decrypt_uid
from services.brevo_service import send_otp_email
from core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


class OTPRequest(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    otp:   str

class NFCLoginRequest(BaseModel):
    encrypted_uid: str


# ── OTP: send ────────────────────────────────────────────────────────────────

@router.post("/send-otp")
@limiter.limit("3/15minutes")
async def send_otp(request: Request, payload: OTPRequest):
    sb = get_supabase()

    # Check member exists with this email
    member = sb.table("members").select("id, first_name").eq("email", payload.email).limit(1).execute()
    if not member.data:
        # Don't reveal whether email exists — return ok anyway
        return {"success": True}

    # Generate 6-digit OTP
    code = str(secrets.randbelow(900000) + 100000)
    hashed = hashlib.sha256(code.encode()).hexdigest()
    expires = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

    # Store OTP — upsert by email
    sb.table("otp_tokens").upsert({
        "email":      payload.email,
        "code_hash":  hashed,
        "expires_at": expires,
        "used":       False,
    }, on_conflict="email").execute()

    # Send via Brevo
    await send_otp_email(
        to_email=payload.email,
        first_name=member.data[0]["first_name"],
        code=code,
    )

    return {"success": True}


# ── OTP: verify ──────────────────────────────────────────────────────────────

@router.post("/verify-otp")
@limiter.limit("5/15minutes")
def verify_otp(request: Request, payload: OTPVerify):
    sb = get_supabase()

    row = sb.table("otp_tokens").select("*").eq("email", payload.email).limit(1).execute()
    if not row.data:
        raise HTTPException(400, "No OTP found. Request a new one.")

    token = row.data[0]

    if token["used"]:
        raise HTTPException(400, "OTP already used.")

    expires = datetime.fromisoformat(token["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(400, "OTP expired. Request a new one.")

    hashed = hashlib.sha256(payload.otp.encode()).hexdigest()
    if hashed != token["code_hash"]:
        return {"valid": False}

    # Mark used
    sb.table("otp_tokens").update({"used": True}).eq("email", payload.email).execute()

    return {"valid": True}


# ── NFC login ─────────────────────────────────────────────────────────────────

@router.post("/nfc-login")
@limiter.limit("5/15minutes")
def nfc_login(request: Request, payload: NFCLoginRequest):
    """
    NFC quick login — no password needed.
    Validates encrypted UID, finds member, creates Supabase session
    via generate_link (magiclink) + verify_otp.
    """
    try:
        decrypt_uid(payload.encrypted_uid)
    except Exception:
        raise HTTPException(404, "Card not recognised.")

    sb = get_supabase()

    # Find member
    member = (
        sb.table("members")
        .select("id, auth_user_id, first_name, last_name, email")
        .eq("encrypted_uid", payload.encrypted_uid)
        .limit(1)
        .execute()
    )
    if not member.data:
        raise HTTPException(404, "Card not registered to any member.")

    m = member.data[0]
    if not m.get("auth_user_id"):
        raise HTTPException(400, "Member account not fully set up. Use email login.")

    # Create session via generate_link + verify_otp
    # (admin.create_session is not available in supabase-py v2.5 / gotrue v2.12)
    try:
        from urllib.parse import urlparse, parse_qs
        import logging
        logger = logging.getLogger(__name__)

        # Step 1: Generate a magic link (server-side only, never sent to user)
        link_resp = sb.auth.admin.generate_link({
            "type": "magiclink",
            "email": m["email"],
        })

        # Step 2: Extract token_hash from the generated action link
        action_link = link_resp.properties.action_link
        parsed = urlparse(action_link)
        query_params = parse_qs(parsed.query)
        token_hash = query_params.get("token_hash", [None])[0]

        if not token_hash:
            # Fallback: try fragment-based token
            fragment_params = parse_qs(parsed.fragment)
            token_hash = fragment_params.get("token_hash", [None])[0]

        if not token_hash:
            logger.error(f"No token_hash found in action_link: {action_link}")
            raise HTTPException(500, "Session creation failed. Contact club leads.")

        # Step 3: Verify the OTP token to get a real session
        session_resp = sb.auth.verify_otp({
            "type": "magiclink",
            "token_hash": token_hash,
        })

        return {
            "access_token":  session_resp.session.access_token,
            "refresh_token": session_resp.session.refresh_token,
            "member":        {"first_name": m["first_name"], "last_name": m["last_name"]},
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Session creation failed: {e}")
        raise HTTPException(500, "Session creation failed. Contact club leads.")
