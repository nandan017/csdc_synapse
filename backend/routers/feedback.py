from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.supabase_service import get_supabase
from services.crypto_service import decrypt_uid

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackSubmit(BaseModel):
    encrypted_uid: str
    workshop_id:   str
    rating:        int          # 1-5
    highlight:     str = ""     # what was good
    improve:       str = ""     # what to improve
    would_return:  bool = True


@router.post("/")
def submit_feedback(payload: FeedbackSubmit):
    if not 1 <= payload.rating <= 5:
        raise HTTPException(400, "Rating must be 1–5.")

    try:
        decrypt_uid(payload.encrypted_uid)
    except Exception:
        raise HTTPException(404, "Card not recognised.")

    sb = get_supabase()

    # Resolve member
    member = (
        sb.table("members")
        .select("id, first_name")
        .eq("encrypted_uid", payload.encrypted_uid)
        .limit(1)
        .execute()
    )
    if not member.data:
        raise HTTPException(404, "Member not found.")

    member_id = member.data[0]["id"]

    # Check workshop exists
    ws = sb.table("workshops").select("id, title").eq("id", payload.workshop_id).limit(1).execute()
    if not ws.data:
        raise HTTPException(404, "Workshop not found.")

    # Duplicate check — one feedback per member per workshop
    existing = (
        sb.table("feedback")
        .select("id")
        .eq("member_id", member_id)
        .eq("workshop_id", payload.workshop_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return {"success": False, "duplicate": True, "message": "Feedback already submitted for this workshop."}

    sb.table("feedback").insert({
        "member_id":    member_id,
        "workshop_id":  payload.workshop_id,
        "rating":       payload.rating,
        "highlight":    payload.highlight.strip(),
        "improve":      payload.improve.strip(),
        "would_return": payload.would_return,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {"success": True, "message": "Feedback recorded. Thank you!"}


@router.get("/workshop/{workshop_id}")
def get_workshop_feedback(workshop_id: str):
    """Admin: get all feedback for a workshop with aggregate stats."""
    sb = get_supabase()

    rows = (
        sb.table("feedback")
        .select("rating, highlight, improve, would_return, submitted_at")
        .eq("workshop_id", workshop_id)
        .order("submitted_at", desc=True)
        .execute()
    )

    data = rows.data or []
    if not data:
        return {"data": [], "aggregate": None}

    ratings     = [r["rating"] for r in data]
    avg_rating  = round(sum(ratings) / len(ratings), 1)
    would_return_pct = round(sum(1 for r in data if r["would_return"]) / len(data) * 100)
    distribution = {str(i): ratings.count(i) for i in range(1, 6)}

    return {
        "data": data,
        "aggregate": {
            "total":            len(data),
            "avg_rating":       avg_rating,
            "would_return_pct": would_return_pct,
            "distribution":     distribution,
        }
    }
