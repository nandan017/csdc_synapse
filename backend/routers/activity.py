from fastapi import APIRouter
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
def get_activity(member_id: str, limit: int = 20):
    """
    Returns a combined activity feed for a member:
    - Their own activity (badges, attendance, tasks, connections)
    - Club-wide notable events
    """
    sb = get_supabase()

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
