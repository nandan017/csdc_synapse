from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from services.supabase_service import get_supabase
from services.crypto_service import decrypt_uid

router = APIRouter(prefix="/connect", tags=["connect"])


class ConnectRequest(BaseModel):
    my_member_id:      str   # logged-in member
    their_encrypted_uid: str  # scanned from their card


@router.post("/")
def tap_to_connect(payload: ConnectRequest):
    """
    Called when member A taps member B's NFC card.
    Creates a bidirectional connection.
    """
    try:
        decrypt_uid(payload.their_encrypted_uid)
    except Exception:
        raise HTTPException(404, "Card not recognised.")

    sb = get_supabase()

    # Find the other member
    other = (
        sb.table("members")
        .select("id, first_name, last_name, stream, year, avatar_url, github, linkedin, skills, bio")
        .eq("encrypted_uid", payload.their_encrypted_uid)
        .limit(1)
        .execute()
    )
    if not other.data:
        raise HTTPException(404, "No member found with this card.")

    other_id = other.data[0]["id"]

    if other_id == payload.my_member_id:
        raise HTTPException(400, "You can't connect with yourself.")

    # Check if already connected
    existing = (
        sb.table("connections")
        .select("id")
        .eq("member_a", payload.my_member_id)
        .eq("member_b", other_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return {
            "success":   True,
            "already":   True,
            "message":   f"Already connected with {other.data[0]['first_name']}!",
            "member":    other.data[0],
        }

    now = datetime.now(timezone.utc).isoformat()

    # Insert both directions for easy querying
    sb.table("connections").insert([
        {"member_a": payload.my_member_id, "member_b": other_id, "connected_at": now},
        {"member_a": other_id, "member_b": payload.my_member_id, "connected_at": now},
    ]).execute()

    # Log activity for both members
    for mid, oid in [(payload.my_member_id, other_id), (other_id, payload.my_member_id)]:
        sb.table("activity").insert({
            "member_id":   mid,
            "type":        "connection",
            "ref_id":      oid,
            "description": f"Connected with {other.data[0]['first_name'] if mid == payload.my_member_id else 'a new member'}",
            "created_at":  now,
        }).execute()

    return {
        "success": True,
        "already": False,
        "message": f"Connected with {other.data[0]['first_name']} {other.data[0]['last_name']}!",
        "member":  other.data[0],
    }


@router.get("/{member_id}")
def get_connections(member_id: str):
    """Get all connections for a member."""
    sb = get_supabase()
    rows = (
        sb.table("connections")
        .select("connected_at, member_b, members!connections_member_b_fkey(id, first_name, last_name, stream, year, avatar_url, github, linkedin, skills, member_archetype)")
        .eq("member_a", member_id)
        .order("connected_at", desc=True)
        .execute()
    )
    return {"data": rows.data or [], "count": len(rows.data or [])}
