from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from services.supabase_service import get_supabase
from core.auth import require_member
from core.limiter import limiter

router = APIRouter(prefix="/reaction", tags=["reaction"])


# ── Models ────────────────────────────────────────────────────────────────────

class AttemptRequest(BaseModel):
    reaction_time_ms: int = Field(..., ge=0, le=2000)
    is_false_start: bool = False


# ── POST /reaction/attempt ────────────────────────────────────────────────────

@router.post("/attempt")
@limiter.limit("30/minute")
async def record_attempt(
    body: AttemptRequest,
    request: Request,
    user=Depends(require_member),
):
    """Record a reaction time attempt. Member ID is derived from JWT."""
    sb = get_supabase()

    # Resolve member_id from auth user
    member_res = sb.table("members").select("id").eq(
        "auth_user_id", user.id
    ).single().execute()

    if not member_res.data:
        raise HTTPException(404, "Member profile not found.")

    member_id = member_res.data["id"]

    # Insert attempt
    sb.table("reaction_attempts").insert({
        "member_id": member_id,
        "reaction_time_ms": body.reaction_time_ms,
        "is_false_start": body.is_false_start,
    }).execute()

    # Calculate personal best and rank
    stats = _get_member_stats(sb, member_id)
    return stats


# ── GET /reaction/leaderboard ────────────────────────────────────────────────

@router.get("/leaderboard")
@limiter.limit("60/minute")
async def get_leaderboard(request: Request):
    """Top 20 fastest reaction times (best per member). Public endpoint."""
    sb = get_supabase()

    # Get all valid attempts with member info, ordered by time
    res = sb.table("reaction_attempts").select(
        "reaction_time_ms, created_at, member_id, "
        "members(first_name, last_name, avatar_url, member_archetype)"
    ).eq(
        "is_false_start", False
    ).order(
        "reaction_time_ms", desc=False
    ).limit(200).execute()

    # Deduplicate: keep only the best time per member
    seen = set()
    leaderboard = []
    for row in (res.data or []):
        mid = row["member_id"]
        if mid in seen:
            continue
        seen.add(mid)
        m = row.get("members", {}) or {}
        leaderboard.append({
            "member_name": f"{m.get('first_name', '')} {m.get('last_name', '')}".strip(),
            "avatar_url": m.get("avatar_url"),
            "member_archetype": m.get("member_archetype"),
            "reaction_time_ms": row["reaction_time_ms"],
            "created_at": row["created_at"],
        })
        if len(leaderboard) >= 20:
            break

    return {"data": leaderboard}


# ── GET /reaction/my-stats ───────────────────────────────────────────────────

@router.get("/my-stats")
@limiter.limit("60/minute")
async def get_my_stats(
    request: Request,
    user=Depends(require_member),
):
    """Get personal reaction time stats for the authenticated member."""
    sb = get_supabase()

    member_res = sb.table("members").select("id").eq(
        "auth_user_id", user.id
    ).single().execute()

    if not member_res.data:
        raise HTTPException(404, "Member profile not found.")

    return _get_member_stats(sb, member_res.data["id"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_member_stats(sb, member_id: str) -> dict:
    """Calculate personal best, attempt count, false starts, and rank."""

    # Personal best
    best_res = sb.table("reaction_attempts").select(
        "reaction_time_ms"
    ).eq(
        "member_id", member_id
    ).eq(
        "is_false_start", False
    ).order(
        "reaction_time_ms", desc=False
    ).limit(1).execute()

    best_ms = best_res.data[0]["reaction_time_ms"] if best_res.data else None

    # Total attempts & false starts
    all_res = sb.table("reaction_attempts").select(
        "is_false_start"
    ).eq(
        "member_id", member_id
    ).execute()

    total_attempts = len(all_res.data) if all_res.data else 0
    false_starts = sum(1 for r in (all_res.data or []) if r["is_false_start"])

    # Rank: count how many members have a better best time
    rank = None
    if best_ms is not None:
        # Get all valid attempts, find best per member, count those better
        all_valid = sb.table("reaction_attempts").select(
            "member_id, reaction_time_ms"
        ).eq(
            "is_false_start", False
        ).order(
            "reaction_time_ms", desc=False
        ).execute()

        member_bests = {}
        for r in (all_valid.data or []):
            mid = r["member_id"]
            if mid not in member_bests:
                member_bests[mid] = r["reaction_time_ms"]

        sorted_times = sorted(member_bests.values())
        try:
            rank = sorted_times.index(best_ms) + 1
        except ValueError:
            rank = len(sorted_times) + 1

        total_players = len(member_bests)
    else:
        total_players = 0

    return {
        "best_ms": best_ms,
        "attempts": total_attempts,
        "false_starts": false_starts,
        "rank": rank,
        "total_players": total_players,
    }
