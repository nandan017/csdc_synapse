from fastapi import APIRouter, Depends
from core.auth import require_member
from services.supabase_service import get_supabase

router = APIRouter(prefix="/activity", tags=["activity"])

ACTIVITY_ICONS = {
    "attendance":  "⚡",
    "badge":       "🏅",
    "task":        "✓",
    "connection":  "🃏",
    "xp":          "📈",
    "onboard":     "👋",
}


@router.get("/{member_id}")
def get_activity(member_id: str, limit: int = 20, user=Depends(require_member)):
    """
    Returns a combined activity feed for a member.
    Validates the requesting user owns this member_id.
    """
    sb = get_supabase()

    # Verify the authenticated user owns this member_id
    me = sb.table("members").select("id").eq("auth_user_id", user.id).limit(1).execute()
    if not me.data or me.data[0]["id"] != member_id:
        from fastapi import HTTPException
        raise HTTPException(403, "You can only view your own activity.")

    rows = (
        sb.table("activity")
        .select("type, description, ref_id, created_at")
        .eq("member_id", member_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    data = rows.data or []
    enriched = []
    for item in data:
        enriched.append({
            **item,
            "icon": ACTIVITY_ICONS.get(item["type"], "●"),
        })

    return {"data": enriched}
