"""
Alumni conversion script.
Run as a cron job — e.g. daily at midnight:
  0 0 * * * python /path/to/backend/scripts/alumni_convert.py

Or call via FastAPI endpoint: POST /admin/alumni/convert
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from services.supabase_service import get_supabase


def convert_alumni():
    sb = get_supabase()
    current_year = datetime.now(timezone.utc).year

    # Members whose batch_year has passed are alumni
    # batch_year = year they graduate (e.g. 2026 means they graduate in 2026)
    rows = (
        sb.table("members")
        .select("id, first_name, last_name, email, batch_year")
        .eq("is_alumni", False)
        .lte("batch_year", current_year - 1)   # batch year already passed
        .execute()
    )

    converted = []
    for member in (rows.data or []):
        sb.table("members").update({
            "is_alumni":   True,
            "role":        "alumni",
            "alumni_since": datetime.now(timezone.utc).isoformat(),
        }).eq("id", member["id"]).execute()

        # Award alumni badge if it exists
        badge = sb.table("badge_definitions").select("id").eq("slug", "alumni").limit(1).execute()
        if badge.data:
            try:
                sb.table("member_badges").insert({
                    "member_id": member["id"],
                    "badge_id":  badge.data[0]["id"],
                }).execute()
            except Exception:
                pass  # badge already awarded

        converted.append(f"{member['first_name']} {member['last_name']} (batch {member['batch_year']})")
        print(f"[alumni] Converted: {member['first_name']} {member['last_name']}")

    print(f"[alumni] Done. {len(converted)} member(s) converted.")
    return converted


# FastAPI endpoint version — add to admin router
def get_alumni_router():
    from fastapi import APIRouter
    router = APIRouter()

    @router.post("/admin/alumni/convert")
    def run_alumni_conversion():
        converted = convert_alumni()
        return {"success": True, "converted": converted, "count": len(converted)}

    @router.get("/admin/alumni/preview")
    def preview_alumni_conversion():
        """Preview who would be converted without actually converting."""
        sb = get_supabase()
        current_year = datetime.now(timezone.utc).year
        rows = (
            sb.table("members")
            .select("id, first_name, last_name, batch_year, stream")
            .eq("is_alumni", False)
            .lte("batch_year", current_year - 1)
            .execute()
        )
        return {"would_convert": rows.data or [], "count": len(rows.data or [])}

    return router


if __name__ == "__main__":
    convert_alumni()
