from fastapi import APIRouter, HTTPException
from services.supabase_service import get_supabase
from services.crypto_service import decrypt_uid

router = APIRouter(prefix="/u", tags=["public-profile"])


@router.get("/{encrypted_uid}")
def get_public_profile(encrypted_uid: str):
    """
    Public profile endpoint — called by /u/[uid] page.
    The encrypted_uid IS the access key (from NFC card / QR code).
    Decrypts UID, fetches member, returns only public-safe fields.
    """
    # Validate + decrypt UID
    try:
        decrypt_uid(encrypted_uid)  # just validates it's a real token
    except Exception:
        raise HTTPException(404, "Profile not found.")

    sb = get_supabase()

    row = (
        sb.table("members")
        .select(
            "id, first_name, last_name, role, member_archetype, "
            "stream, year, bio, skills, avatar_url, "
            "github, linkedin, xp, visibility_mode, "
            "batch_year, is_alumni, created_at"
        )
        .eq("encrypted_uid", encrypted_uid)
        .limit(1)
        .execute()
    )

    if not row.data:
        raise HTTPException(404, "Profile not found.")

    member = row.data[0]

    # Fetch badges (public)
    badges = (
        sb.table("member_badges")
        .select("badge_definitions(slug, name, icon)")
        .eq("member_id", member["id"])
        .limit(6)
        .execute()
    )

    return {
        "first_name":      member["first_name"],
        "last_name":       member["last_name"],
        "role":            member["role"],
        "member_archetype":member["member_archetype"],
        "stream":          member["stream"],
        "year":            member["year"],
        "bio":             member["bio"],
        "skills":          member["skills"] or [],
        "avatar_url":      member["avatar_url"],
        "github":          member["github"],
        "linkedin":        member["linkedin"],
        "xp":              member["xp"],
        "visibility_mode": member["visibility_mode"],
        "is_alumni":       member["is_alumni"],
        "batch_year":      member["batch_year"],
        "joined":          member["created_at"],
        "badges":          [b["badge_definitions"] for b in (badges.data or [])],
    }
