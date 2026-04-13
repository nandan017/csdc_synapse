from supabase import create_client, Client
from core.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client


# ── Applications ──────────────────────────────────────────────────────────────

def create_application(data: dict) -> dict:
    sb = get_supabase()
    response = sb.table("applications").insert(data).execute()
    return response.data[0]


def get_application_by_email(email: str) -> dict | None:
    sb = get_supabase()
    response = (
        sb.table("applications")
        .select("*")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    if response.data and len(response.data) > 0:
        return response.data[0]
    return None


def application_exists(email: str) -> bool:
    return get_application_by_email(email) is not None


# ── Members ───────────────────────────────────────────────────────────────────

def get_member_by_uid(encrypted_uid: str) -> dict | None:
    sb = get_supabase()
    response = (
        sb.table("members")
        .select("*")
        .eq("encrypted_uid", encrypted_uid)
        .limit(1)
        .execute()
    )
    if response.data and len(response.data) > 0:
        return response.data[0]
    return None


def get_member_public_profile(encrypted_uid: str) -> dict | None:
    sb = get_supabase()
    response = (
        sb.table("members")
        .select(
            "id, first_name, last_name, bio, github, linkedin, "
            "skills, avatar_url, xp, badges, member_archetype, "
            "visibility_mode, batch_year, is_alumni, created_at"
        )
        .eq("encrypted_uid", encrypted_uid)
        .limit(1)
        .execute()
    )
    if response.data and len(response.data) > 0:
        return response.data[0]
    return None