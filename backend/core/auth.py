from fastapi import Depends, HTTPException, Request
from services.supabase_service import get_supabase

ADMIN_EMAILS = ["chathuryastudentdevclub@gmail.com"]


async def require_admin(request: Request):
    """
    Validates the Authorization header contains a valid Supabase JWT
    belonging to an admin email.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header.")

    token = auth_header.split("Bearer ")[1]
    sb = get_supabase()

    try:
        user_response = sb.auth.get_user(token)
        user = user_response.user
    except Exception:
        raise HTTPException(401, "Invalid or expired token.")

    if not user or user.email not in ADMIN_EMAILS:
        raise HTTPException(403, "You do not have admin privileges.")

    return user


async def require_member(request: Request):
    """
    Validates the Authorization header contains a valid Supabase JWT
    for any authenticated member.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header.")

    token = auth_header.split("Bearer ")[1]
    sb = get_supabase()

    try:
        user_response = sb.auth.get_user(token)
        user = user_response.user
    except Exception:
        raise HTTPException(401, "Invalid or expired token.")

    if not user:
        raise HTTPException(401, "Authentication required.")

    return user
