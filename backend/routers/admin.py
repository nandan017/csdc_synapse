from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from pydantic import BaseModel
from services import supabase_service, brevo_service
from services.crypto_service import generate_uid, encrypt_uid
import csv, io

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
    start_at: str
    end_at: str
    daily_start_time: str = "09:00"
    daily_end_time: str = "17:00"
    location: str = ""
    xp_for_attend: int = 50      # per day
    late_penalty: int = 10


class BadgeAward(BaseModel):
    member_id: str
    badge_slug: str

class PollCreate(BaseModel):
    title:       str
    description: str = ""
    options:     list[dict]   # [{"id": "opt_0", "label": "Option A"}, ...]
    closes_at:   Optional[str] = None

# Role hierarchy — matches CoC style
VALID_ROLES = ["member", "core_team", "co_lead", "club_lead"]
ROLE_LABELS = {
    "member":    "Member",
    "core_team": "Core Team",
    "co_lead":   "Co-Lead",
    "club_lead": "Club Lead",
}
class RoleUpdate(BaseModel):
    role: str  # one of VALID_ROLES
    
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
    }, on_conflict="application_id").execute()

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

@router.get("/workshops/upcoming")
def get_upcoming_workshops():
    from datetime import datetime, timezone
    sb = supabase_service.get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    rows = (
        sb.table("workshops")
        .select("id, title, description, start_at, end_at, location, xp_for_attend")
        .gte("end_at", now)
        .order("start_at", desc=False)
        .limit(5)
        .execute()
    )
    return {"data": rows.data or []}



@router.get("/workshops")
def list_workshops():
    sb = supabase_service.get_supabase()
    response = sb.table("workshops").select("*").order("start_at", desc=True).execute()
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
def workshop_attendance(workshop_id: str, date: str = None):
    sb = supabase_service.get_supabase()
    q = sb.table("attendance").select(
        "*, members(first_name, last_name, email, year, section)"
    ).eq("workshop_id", workshop_id)
    if date:
        q = q.eq("attend_date", date)
    q = q.order("tapped_at", desc=False)
    response = q.execute()
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

@router.post("/polls")
def create_poll(p: PollCreate):
    sb = supabase_service.get_supabase()
    response = sb.table("polls").insert({
        "title":       p.title,
        "description": p.description,
        "options":     p.options,
        "closes_at":   p.closes_at,
        "is_active":   False,
    }).execute()
    return {"success": True, "data": response.data[0]}


@router.patch("/polls/{poll_id}/activate")
def toggle_poll(poll_id: str, active: bool):
    sb = supabase_service.get_supabase()
    sb.table("polls").update({"is_active": active}).eq("id", poll_id).execute()
    return {"success": True}

@router.patch("/members/{member_id}/nfc-written")
def mark_nfc_written(member_id: str):
    sb = supabase_service.get_supabase()
    from datetime import datetime, timezone
    response = sb.table("members").update({
        "nfc_written_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", member_id).execute()
    if not response.data:
        raise HTTPException(404, "Member not found.")
    return {"success": True}


@router.patch("/members/{member_id}/role")
def update_member_role(member_id: str, payload: RoleUpdate):
    if payload.role not in VALID_ROLES:
        raise HTTPException(400, f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")

    sb = supabase_service.get_supabase()

    # Only one club_lead allowed at a time — demote existing if needed
    if payload.role == "club_lead":
        sb.table("members").update({"role": "co_lead"}).eq("role", "club_lead").execute()

    response = sb.table("members").update({
        "role": payload.role
    }).eq("id", member_id).execute()

    if not response.data:
        raise HTTPException(404, "Member not found.")

    return {"success": True, "role": payload.role, "label": ROLE_LABELS[payload.role]}

@router.get("/workshops/{workshop_id}/attendance/csv")
def export_attendance_csv(workshop_id: str, date: str = None):
    sb = supabase_service.get_supabase()
    ws = sb.table("workshops").select("title").eq("id", workshop_id).limit(1).execute()
    ws_title = ws.data[0]["title"] if ws.data else "workshop"
    q = sb.table("attendance").select(
        "attend_date, tapped_at, is_late, xp_awarded, "
        "members(first_name, last_name, email, year, section)"
    ).eq("workshop_id", workshop_id)
    if date:
        q = q.eq("attend_date", date)
    q = q.order("attend_date", desc=False).order("tapped_at", desc=False)
    rows = q.execute()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Name", "Email", "Year", "Section", "Tapped At", "Late", "XP"])
    for r in (rows.data or []):
        m = r.get("members", {})
        writer.writerow([
            r["attend_date"],
            f"{m.get('first_name','')} {m.get('last_name','')}",
            m.get("email", ""), m.get("year", ""), m.get("section", ""),
            r["tapped_at"], "Yes" if r["is_late"] else "No", r["xp_awarded"],
        ])
    output.seek(0)
    safe = ws_title.replace(" ", "_").lower()
    fn = f"{safe}_attendance{'_' + date if date else '_all'}.csv"
    return StreamingResponse(
        iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fn}"}
    )

@router.get("/members/{member_id}/attendance-stats")
def member_attendance_stats(member_id: str):
    sb = supabase_service.get_supabase()
    rows = sb.table("attendance").select("workshop_id, attend_date").eq("member_id", member_id).execute()
    total_days = len(rows.data or [])
    workshops = set(r["workshop_id"] for r in (rows.data or []))
    return {"total_days_attended": total_days, "workshops_attended": len(workshops)}
