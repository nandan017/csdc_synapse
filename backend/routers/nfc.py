from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from services.supabase_service import get_supabase
from services.crypto_service import decrypt_uid

router = APIRouter(tags=["nfc"])


# ── Models ────────────────────────────────────────────────────────────────────

class AttendRequest(BaseModel):
    encrypted_uid: str
    workshop_id:   str

class VoteRequest(BaseModel):
    encrypted_uid: str
    poll_id:       str
    option_id:     str


# ── Helpers ───────────────────────────────────────────────────────────────────

def resolve_member(encrypted_uid: str) -> dict:
    """Decrypt UID and fetch member. Raises 404 if not found."""
    try:
        decrypt_uid(encrypted_uid)
    except Exception:
        raise HTTPException(404, "Card not recognised.")

    sb = get_supabase()
    row = (
        sb.table("members")
        .select("id, first_name, last_name, xp")
        .eq("encrypted_uid", encrypted_uid)
        .limit(1)
        .execute()
    )
    if not row.data:
        raise HTTPException(404, "Member not found. Card may not be registered yet.")
    return row.data[0]


# ── Attendance ────────────────────────────────────────────────────────────────

@router.post("/attend")
def record_attendance(payload: AttendRequest):
    """
    Called by the /attend/[workshop_id] page when a card is tapped.
    1. Resolve member from UID
    2. Check workshop is active
    3. Prevent duplicate tap
    4. Record attendance + award XP
    """
    sb = get_supabase()
    member = resolve_member(payload.encrypted_uid)

    # Check workshop exists and is active
    ws = (
        sb.table("workshops")
        .select("id, title, xp_for_attend, late_penalty, late_threshold, is_active, scheduled_at")
        .eq("id", payload.workshop_id)
        .limit(1)
        .execute()
    )
    if not ws.data:
        raise HTTPException(404, "Workshop not found.")

    workshop = ws.data[0]
    if not workshop["is_active"]:
        raise HTTPException(400, "This workshop is not currently active.")

    # Duplicate check
    existing = (
        sb.table("attendance")
        .select("id")
        .eq("member_id", member["id"])
        .eq("workshop_id", payload.workshop_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return {
            "success":    False,
            "duplicate":  True,
            "message":    f"Already tapped in, {member['first_name']}!",
            "member":     {"first_name": member["first_name"], "last_name": member["last_name"]},
        }

    # Determine if late
    now = datetime.now(timezone.utc)
    scheduled = datetime.fromisoformat(workshop["scheduled_at"].replace("Z", "+00:00"))

    # Parse late_threshold (stored as postgres interval string e.g. "00:15:00")
    try:
        parts = str(workshop["late_threshold"]).split(":")
        threshold_minutes = int(parts[0]) * 60 + int(parts[1])
    except Exception:
        threshold_minutes = 15

    from datetime import timedelta
    is_late    = now > scheduled + timedelta(minutes=threshold_minutes)
    xp_awarded = max(0, workshop["xp_for_attend"] - (workshop["late_penalty"] if is_late else 0))

    # Insert attendance
    sb.table("attendance").insert({
        "member_id":   member["id"],
        "workshop_id": payload.workshop_id,
        "tapped_at":   now.isoformat(),
        "is_late":     is_late,
        "xp_awarded":  xp_awarded,
    }).execute()

    # Award XP via ledger (trigger auto-updates members.xp)
    sb.table("xp_ledger").insert({
        "member_id": member["id"],
        "delta":     xp_awarded,
        "reason":    "workshop_attend",
        "ref_id":    payload.workshop_id,
    }).execute()

    return {
        "success":    True,
        "duplicate":  False,
        "is_late":    is_late,
        "xp_awarded": xp_awarded,
        "workshop":   workshop["title"],
        "member":     {"first_name": member["first_name"], "last_name": member["last_name"]},
        "message":    f"{'Late tap — ' if is_late else ''}+{xp_awarded} XP awarded!",
    }


@router.get("/attend/{workshop_id}/status")
def attendance_status(workshop_id: str):
    """Returns workshop info + live attendance count for the reader page."""
    sb = get_supabase()

    ws = (
        sb.table("workshops")
        .select("id, title, is_active, scheduled_at, xp_for_attend")
        .eq("id", workshop_id)
        .limit(1)
        .execute()
    )
    if not ws.data:
        raise HTTPException(404, "Workshop not found.")

    count = (
        sb.table("attendance")
        .select("id", count="exact")
        .eq("workshop_id", workshop_id)
        .execute()
    )

    return {
        **ws.data[0],
        "attendance_count": count.count or 0,
    }


# ── Voting ────────────────────────────────────────────────────────────────────

@router.post("/vote")
def record_vote(payload: VoteRequest):
    """
    Called by the /vote/[poll_id] page when a card is tapped.
    1. Resolve member
    2. Check poll is active
    3. Validate option exists
    4. Prevent duplicate vote
    5. Record vote
    """
    sb = get_supabase()
    member = resolve_member(payload.encrypted_uid)

    # Check poll
    poll = (
        sb.table("polls")
        .select("id, title, options, is_active, closes_at")
        .eq("id", payload.poll_id)
        .limit(1)
        .execute()
    )
    if not poll.data:
        raise HTTPException(404, "Poll not found.")

    p = poll.data[0]
    if not p["is_active"]:
        raise HTTPException(400, "This poll is not active.")

    # Check closes_at
    if p.get("closes_at"):
        closes = datetime.fromisoformat(p["closes_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > closes:
            raise HTTPException(400, "This poll has closed.")

    # Validate option
    options = p["options"] if isinstance(p["options"], list) else []
    valid_ids = [o["id"] for o in options]
    if payload.option_id not in valid_ids:
        raise HTTPException(400, "Invalid option.")

    # Duplicate check
    existing = (
        sb.table("votes")
        .select("id")
        .eq("poll_id", payload.poll_id)
        .eq("member_id", member["id"])
        .limit(1)
        .execute()
    )
    if existing.data:
        return {
            "success":   False,
            "duplicate": True,
            "message":   f"Already voted, {member['first_name']}!",
            "member":    {"first_name": member["first_name"], "last_name": member["last_name"]},
        }

    # Record vote
    sb.table("votes").insert({
        "poll_id":   payload.poll_id,
        "member_id": member["id"],
        "option_id": payload.option_id,
        "voted_at":  datetime.now(timezone.utc).isoformat(),
    }).execute()

    option_label = next((o["label"] for o in options if o["id"] == payload.option_id), payload.option_id)

    return {
        "success":      True,
        "duplicate":    False,
        "message":      f"Vote cast for \"{option_label}\"",
        "poll_title":   p["title"],
        "option_label": option_label,
        "member":       {"first_name": member["first_name"], "last_name": member["last_name"]},
    }


@router.get("/polls/active")
def get_active_polls():
    """Returns all currently active polls."""
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    rows = (
        sb.table("polls")
        .select("id, title, description, options, closes_at")
        .eq("is_active", True)
        .execute()
    )
    return {"polls": rows.data or []}


@router.get("/polls/{poll_id}")
def get_poll(poll_id: str):
    sb = get_supabase()
    row = (
        sb.table("polls")
        .select("id, title, description, options, is_active, closes_at")
        .eq("id", poll_id)
        .limit(1)
        .execute()
    )
    if not row.data:
        raise HTTPException(404, "Poll not found.")

    # Get vote counts per option
    votes = (
        sb.table("votes")
        .select("option_id")
        .eq("poll_id", poll_id)
        .execute()
    )
    counts: dict[str, int] = {}
    for v in (votes.data or []):
        oid = v["option_id"]
        counts[oid] = counts.get(oid, 0) + 1

    return {**row.data[0], "vote_counts": counts, "total_votes": len(votes.data or [])}
