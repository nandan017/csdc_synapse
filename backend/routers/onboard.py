import bcrypt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.supabase_service import get_supabase
from services.crypto_service import generate_uid, encrypt_uid

router = APIRouter(prefix="/onboard", tags=["onboard"])


# ── Models ────────────────────────────────────────────────────────────────────

class OnboardComplete(BaseModel):
    token:        str
    password:     str          # confirm against stored hash
    bio:          str = ""
    skills:       list[str] = []
    avatar_url:   Optional[str] = None   # Supabase Storage URL if uploaded


# ── Validate token ────────────────────────────────────────────────────────────

@router.get("/validate")
def validate_token(token: str):
    """
    Check token is valid, not expired, not used.
    Returns pre-filled applicant data for the form.
    """
    sb = get_supabase()

    row = (
        sb.table("invite_tokens")
        .select("*, applications(*)")
        .eq("token", token)
        .limit(1)
        .execute()
    )

    if not row.data:
        raise HTTPException(404, "Invalid invite link.")

    invite = row.data[0]

    # Already used
    if invite.get("used_at"):
        raise HTTPException(410, "This invite link has already been used.")

    # Expired
    expires_at = datetime.fromisoformat(
        invite["expires_at"].replace("Z", "+00:00")
    )
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(410, "This invite link has expired. Contact the club leads.")

    app = invite["applications"]

    return {
        "valid":       True,
        "first_name":  app["first_name"],
        "last_name":   app["last_name"],
        "email":       app["email"],
        "year":        app["year"],
        "section":     app["section"],
        "stream":      app["stream"],
        "tshirt_size": app["tshirt_size"],
        "linkedin":    app["linkedin"],
        "github":      app["github"],
        "application_id": app["id"],
    }


# ── Complete onboarding ───────────────────────────────────────────────────────

@router.post("/complete")
def complete_onboarding(payload: OnboardComplete):
    """
    1. Validate token again
    2. Verify password against stored hash
    3. Create Supabase Auth user
    4. Insert member row
    5. Mark token used + application onboarded
    """
    sb = get_supabase()

    # 1. Validate token
    row = (
        sb.table("invite_tokens")
        .select("*, applications(*)")
        .eq("token", payload.token)
        .limit(1)
        .execute()
    )
    if not row.data:
        raise HTTPException(404, "Invalid invite link.")

    invite = row.data[0]

    if invite.get("used_at"):
        raise HTTPException(410, "This invite link has already been used.")

    expires_at = datetime.fromisoformat(
        invite["expires_at"].replace("Z", "+00:00")
    )
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(410, "Invite link expired.")

    app = invite["applications"]

    # 2. Verify password against stored hash
    stored_hash = app.get("password_hash", "")
    if not bcrypt.checkpw(payload.password.encode("utf-8"), stored_hash.encode("utf-8")):
        raise HTTPException(401, "Incorrect password. Use the password you set during registration.")

    # 3. Create Supabase Auth user
    try:
        auth_response = sb.auth.admin.create_user({
            "email":    app["email"],
            "password": payload.password,
            "email_confirm": True,
        })
        auth_user_id = auth_response.user.id
    except Exception as e:
        err_str = str(e)
        # User already exists — get their ID
        if "already been registered" in err_str or "already exists" in err_str:
            existing = sb.auth.admin.list_users()
            user = next((u for u in existing if u.email == app["email"]), None)
            if not user:
                raise HTTPException(500, "Auth error. Contact club leads.")
            auth_user_id = user.id
        else:
            raise HTTPException(500, f"Failed to create account: {err_str}")

    # 4. Generate & encrypt UID for NFC card
    raw_uid       = generate_uid()
    encrypted_uid = encrypt_uid(raw_uid)

    # Determine batch year from year of study
    current_year = datetime.now(timezone.utc).year
    batch_year   = current_year + (3 - int(app["year"]))

    # 5. Insert member row
    try:
        sb.table("members").insert({
            "auth_user_id":   auth_user_id,
            "application_id": app["id"],
            "first_name":     app["first_name"],
            "last_name":      app["last_name"],
            "email":          app["email"],
            "phone":          app.get("phone", ""),
            "year":           int(app["year"]),
            "section":        app["section"],
            "stream":         app.get("stream", "BCA"),
            "batch_year":     batch_year,
            "raw_uid":        raw_uid,
            "encrypted_uid":  encrypted_uid,
            "tshirt_size":    app["tshirt_size"],
            "linkedin":       app["linkedin"],
            "github":         app["github"],
            "bio":            payload.bio.strip(),
            "skills":         payload.skills,
            "avatar_url":     payload.avatar_url,
            "role":           "member",
            "xp":             0,
        }).execute()
    except Exception as e:
        err_str = str(e)
        if "duplicate" in err_str.lower() or "23505" in err_str:
            # Member already exists — still mark token used
            pass
        else:
            raise HTTPException(500, f"Failed to create member profile: {err_str}")

    # 6. Mark token as used
    sb.table("invite_tokens").update({
        "used_at": datetime.now(timezone.utc).isoformat()
    }).eq("token", payload.token).execute()

    # 7. Update application status
    sb.table("applications").update({
        "status": "onboarded"
    }).eq("id", app["id"]).execute()

    return {
        "success": True,
        "message": "Welcome to Chathurya!",
        "email":   app["email"],
    }
