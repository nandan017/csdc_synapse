from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from services import supabase_service, brevo_service
from services.crypto_service import generate_uid, encrypt_uid

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Models ────────────────────────────────────────────────────────────────────

class ApplicationAction(BaseModel):
    status: str          # 'approved' | 'rejected'
    note: Optional[str] = None

class InviteRequest(BaseModel):
    application_id: str

class BulkInviteRequest(BaseModel):
    application_ids: list[str]

class WorkshopCreate(BaseModel):
    title: str
    description: str
    scheduled_at: str
    location: str = ""
    xp_for_attend: int = 50
    late_penalty: int = 10

class BadgeAward(BaseModel):
    member_id: str
    badge_slug: str


# ── Applications ──────────────────────────────────────────────────────────────

@router.get("/applications")
def list_applications(
    status: Optional[str] = Query(None),
    stream: Optional[str] = Query(None),
    year:   Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit:  int = Query(50),
    offset: int = Query(0),
):
    sb = supabase_service.get_supabase()
    q = sb.table("applications").select("*")

    if status: q = q.eq("status", status)
    if stream: q = q.eq("stream", stream)
    if year:   q = q.eq("year", year)
    if search:
        q = q.or_(
            f"first_name.ilike.%{search}%,"
            f"last_name.ilike.%{search}%,"
            f"email.ilike.%{search}%"
        )

    q = q.order("created_at", desc=True).range(offset, offset + limit - 1)
    response = q.execute()

    # Get total count
    count_q = sb.table("applications").select("id", count="exact")
    if status: count_q = count_q.eq("status", status)
    if stream: count_q = count_q.eq("stream", stream)
    if year:   count_q = count_q.eq("year", year)
    count_response = count_q.execute()

    return {
        "data": response.data,
        "total": count_response.count or 0,
        "limit": limit,
        "offset": offset,
    }


@router.patch("/applications/{app_id}")
def update_application(app_id: str, action: ApplicationAction):
    if action.status not in ("approved", "rejected"):
        raise HTTPException(400, "Status must be 'approved' or 'rejected'")

    sb = supabase_service.get_supabase()
    from datetime import datetime, timezone
    update_data = {
        "status": action.status,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }
    response = sb.table("applications").update(update_data).eq("id", app_id).execute()
    if not response.data:
        raise HTTPException(404, "Application not found")
    return {"success": True, "data": response.data[0]}


@router.post("/applications/{app_id}/invite")
async def send_invite(app_id: str):
    sb = supabase_service.get_supabase()

    # Get application
    app = sb.table("applications").select("*").eq("id", app_id).execute()
    if not app.data:
        raise HTTPException(404, "Application not found")
    application = app.data[0]

    if application["status"] != "approved":
        raise HTTPException(400, "Application must be approved before sending invite")

    # Generate invite token
    import secrets
    from datetime import datetime, timezone, timedelta
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    # Save token
    sb.table("invite_tokens").upsert({
        "application_id": app_id,
        "token": token,
        "expires_at": expires,
    }).execute()

    # Update application
    sb.table("applications").update({
        "invite_sent_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", app_id).execute()

    # Send email
    await brevo_service.send_invite_email(
        first_name=application["first_name"],
        last_name=application["last_name"],
        to_email=application["email"],
        invite_token=token,
    )

    return {"success": True, "message": f"Invite sent to {application['email']}"}


@router.post("/applications/bulk-invite")
async def bulk_invite(req: BulkInviteRequest):
    results = []
    for app_id in req.application_ids:
        try:
            result = await send_invite(app_id)
            results.append({"id": app_id, "success": True})
        except Exception as e:
            results.append({"id": app_id, "success": False, "error": str(e)})
    return {"results": results}


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/members")
def list_members(
    search: Optional[str] = Query(None),
    year:   Optional[int] = Query(None),
    is_alumni: Optional[bool] = Query(None),
    limit:  int = Query(50),
    offset: int = Query(0),
):
    sb = supabase_service.get_supabase()
    q = sb.table("members").select(
        "id, first_name, last_name, email, year, section, stream, "
        "xp, role, is_alumni, batch_year, tshirt_size, tshirt_dispatched, "
        "encrypted_uid, avatar_url, created_at, linkedin, github"
    )
    if search:
        q = q.or_(f"first_name.ilike.%{search}%,last_name.ilike.%{search}%,email.ilike.%{search}%")
    if year:      q = q.eq("year", year)
    if is_alumni is not None: q = q.eq("is_alumni", is_alumni)
    q = q.order("xp", desc=True).range(offset, offset + limit - 1)
    response = q.execute()

    count_response = sb.table("members").select("id", count="exact").execute()
    return {
        "data": response.data,
        "total": count_response.count or 0,
    }


@router.patch("/members/{member_id}/tshirt")
def mark_tshirt_dispatched(member_id: str):
    sb = supabase_service.get_supabase()
    response = sb.table("members").update(
        {"tshirt_dispatched": True}
    ).eq("id", member_id).execute()
    if not response.data:
        raise HTTPException(404, "Member not found")
    return {"success": True}


@router.post("/members/{member_id}/award-badge")
def award_badge(member_id: str, req: BadgeAward):
    sb = supabase_service.get_supabase()
    badge = sb.table("badge_definitions").select("id").eq("slug", req.badge_slug).execute()
    if not badge.data:
        raise HTTPException(404, "Badge not found")
    try:
        sb.table("member_badges").insert({
            "member_id": member_id,
            "badge_id": badge.data[0]["id"],
        }).execute()
    except Exception:
        raise HTTPException(409, "Badge already awarded")
    return {"success": True}


@router.post("/members/{member_id}/xp")
def award_xp(member_id: str, delta: int, reason: str):
    sb = supabase_service.get_supabase()
    sb.table("xp_ledger").insert({
        "member_id": member_id,
        "delta": delta,
        "reason": reason,
    }).execute()
    return {"success": True}


# ── Workshops ─────────────────────────────────────────────────────────────────

@router.get("/workshops")
def list_workshops():
    sb = supabase_service.get_supabase()
    response = sb.table("workshops").select("*").order("scheduled_at", desc=True).execute()
    return {"data": response.data}


@router.post("/workshops")
def create_workshop(w: WorkshopCreate):
    sb = supabase_service.get_supabase()
    response = sb.table("workshops").insert(w.model_dump()).execute()
    return {"success": True, "data": response.data[0]}


@router.patch("/workshops/{workshop_id}/activate")
def toggle_workshop(workshop_id: str, active: bool):
    sb = supabase_service.get_supabase()
    sb.table("workshops").update({"is_active": active}).eq("id", workshop_id).execute()
    return {"success": True}


@router.get("/workshops/{workshop_id}/attendance")
def workshop_attendance(workshop_id: str):
    sb = supabase_service.get_supabase()
    response = sb.table("attendance").select(
        "*, members(first_name, last_name, email, year, section)"
    ).eq("workshop_id", workshop_id).execute()
    return {"data": response.data}


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics/overview")
def analytics_overview():
    sb = supabase_service.get_supabase()

    total_apps     = sb.table("applications").select("id", count="exact").execute()
    pending_apps   = sb.table("applications").select("id", count="exact").eq("status","pending").execute()
    approved_apps  = sb.table("applications").select("id", count="exact").eq("status","approved").execute()
    rejected_apps  = sb.table("applications").select("id", count="exact").eq("status","rejected").execute()
    total_members  = sb.table("members").select("id", count="exact").execute()
    total_workshops= sb.table("workshops").select("id", count="exact").execute()

    # Stream breakdown
    streams = {}
    for s in ["BCA","BCom","BBA"]:
        r = sb.table("applications").select("id", count="exact").eq("stream", s).execute()
        streams[s] = r.count or 0

    # Year breakdown
    years = {}
    for y in [1, 2, 3]:
        r = sb.table("applications").select("id", count="exact").eq("year", y).execute()
        years[str(y)] = r.count or 0

    # Top 5 XP leaderboard
    leaderboard = sb.table("members").select(
        "first_name, last_name, xp, member_archetype"
    ).order("xp", desc=True).limit(5).execute()

    return {
        "applications": {
            "total":    total_apps.count or 0,
            "pending":  pending_apps.count or 0,
            "approved": approved_apps.count or 0,
            "rejected": rejected_apps.count or 0,
        },
        "members":   total_members.count or 0,
        "workshops": total_workshops.count or 0,
        "by_stream": streams,
        "by_year":   years,
        "leaderboard": leaderboard.data,
    }
