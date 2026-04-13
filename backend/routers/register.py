import bcrypt
from fastapi import APIRouter, HTTPException
from models.application import ApplicationRequest, ApplicationResponse
from services import supabase_service, brevo_service

router = APIRouter()


@router.post("/register", response_model=ApplicationResponse, status_code=201)
async def register(payload: ApplicationRequest):

    # 1. Duplicate check
    if supabase_service.application_exists(payload.email):
        raise HTTPException(
            status_code=409,
            detail="An application with this email already exists."
        )

    # 2. Hash password
    hashed_pw = bcrypt.hashpw(
        payload.password.encode("utf-8"),
        bcrypt.gensalt(rounds=12)
    ).decode("utf-8")

    # 3. Build DB row
    application_data = {
        "first_name":    payload.firstName.strip(),
        "last_name":     payload.lastName.strip(),
        "email":         payload.email.lower().strip(),
        "phone":         payload.phone.strip(),
        "year":          int(payload.year),
        "section":       payload.section,
        "stream":        payload.stream,
        "password_hash": hashed_pw,
        "linkedin":      payload.linkedin.strip(),
        "github":        payload.github.strip(),
        "tshirt_size":   payload.tshirtSize,
        "why_join":      payload.whyJoin.strip(),
        "suggestions":   payload.suggestions.strip(),
        "status":        "pending",
    }

    # 4. Insert into Supabase
    try:
        supabase_service.create_application(application_data)
    except Exception as e:
        print(f"[Supabase] Insert error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to save your application. Please try again."
        )

    # 5. Send confirmation email
    await brevo_service.send_application_confirmation(
        first_name=payload.firstName,
        last_name=payload.lastName,
        to_email=payload.email,
    )

    return ApplicationResponse(
        success=True,
        message="Application received! Check your email for confirmation."
    )