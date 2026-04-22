from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.supabase_service import get_supabase

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ── Models ────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    workshop_id:  str
    title:        str
    description:  str
    task_type:    str = "manual"       # "manual" | "github"
    github_repo:  Optional[str] = None # required if task_type == "github"
    xp_reward:    int = 30
    due_date:     Optional[str] = None

class TaskSubmit(BaseModel):
    task_id:      str
    member_id:    str
    submission_url: Optional[str] = None   # GitHub PR / repo URL
    notes:        Optional[str] = None

class TaskGrade(BaseModel):
    status:    str   # "approved" | "rejected"
    feedback:  Optional[str] = None
    xp_awarded: Optional[int] = None   # override default xp_reward


# ── Admin: create task ────────────────────────────────────────────────────────

@router.post("/")
def create_task(t: TaskCreate):
    sb = get_supabase()

    # Verify workshop exists
    ws = sb.table("workshops").select("id, title").eq("id", t.workshop_id).limit(1).execute()
    if not ws.data:
        raise HTTPException(404, "Workshop not found.")

    row = sb.table("tasks").insert({
        "workshop_id":  t.workshop_id,
        "title":        t.title,
        "description":  t.description,
        "task_type":    t.task_type,
        "github_repo":  t.github_repo,
        "xp_reward":    t.xp_reward,
        "due_date":     t.due_date,
        "is_active":    True,
    }).execute()

    return {"success": True, "data": row.data[0]}


@router.get("/workshop/{workshop_id}")
def get_workshop_tasks(workshop_id: str):
    sb = get_supabase()
    rows = (
        sb.table("tasks")
        .select("*")
        .eq("workshop_id", workshop_id)
        .order("created_at", desc=False)
        .execute()
    )
    return {"data": rows.data or []}


@router.get("/")
def list_all_tasks(workshop_id: Optional[str] = None):
    sb = get_supabase()
    q = sb.table("tasks").select("*, workshops(title)")
    if workshop_id:
        q = q.eq("workshop_id", workshop_id)
    rows = q.order("created_at", desc=True).execute()
    return {"data": rows.data or []}


# ── Member: submit task ───────────────────────────────────────────────────────

@router.post("/submit")
def submit_task(payload: TaskSubmit):
    sb = get_supabase()

    # Check task exists and is active
    task = sb.table("tasks").select("*").eq("id", payload.task_id).limit(1).execute()
    if not task.data:
        raise HTTPException(404, "Task not found.")
    if not task.data[0]["is_active"]:
        raise HTTPException(400, "This task is no longer accepting submissions.")

    # Check member exists
    member = sb.table("members").select("id").eq("id", payload.member_id).limit(1).execute()
    if not member.data:
        raise HTTPException(404, "Member not found.")

    # Duplicate submission check
    existing = (
        sb.table("task_submissions")
        .select("id, status")
        .eq("task_id", payload.task_id)
        .eq("member_id", payload.member_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        if existing.data[0]["status"] in ("pending", "approved"):
            raise HTTPException(409, "You have already submitted this task.")
        # Allow resubmit if rejected
        sb.table("task_submissions").update({
            "submission_url": payload.submission_url,
            "notes":          payload.notes,
            "status":         "pending",
            "submitted_at":   datetime.now(timezone.utc).isoformat(),
            "feedback":       None,
        }).eq("id", existing.data[0]["id"]).execute()
        return {"success": True, "message": "Resubmission received."}

    sb.table("task_submissions").insert({
        "task_id":        payload.task_id,
        "member_id":      payload.member_id,
        "submission_url": payload.submission_url,
        "notes":          payload.notes,
        "status":         "pending",
        "submitted_at":   datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {"success": True, "message": "Submission received. Leads will review it."}


# ── Admin: list submissions ───────────────────────────────────────────────────

@router.get("/submissions")
def list_submissions(
    task_id:    Optional[str] = None,
    status:     Optional[str] = None,
    workshop_id: Optional[str] = None,
):
    sb = get_supabase()
    q = sb.table("task_submissions").select(
        "*, tasks(title, xp_reward, workshop_id, workshops(title)), "
        "members(first_name, last_name, email)"
    )
    if task_id:     q = q.eq("task_id", task_id)
    if status:      q = q.eq("status", status)
    rows = q.order("submitted_at", desc=True).execute()

    data = rows.data or []

    # Filter by workshop_id if provided
    if workshop_id:
        data = [r for r in data if r.get("tasks", {}).get("workshop_id") == workshop_id]

    return {"data": data}


# ── Admin: grade submission ───────────────────────────────────────────────────

@router.patch("/submissions/{submission_id}/grade")
def grade_submission(submission_id: str, grade: TaskGrade):
    if grade.status not in ("approved", "rejected"):
        raise HTTPException(400, "Status must be 'approved' or 'rejected'")

    sb = get_supabase()

    # Get submission + task for XP
    sub = (
        sb.table("task_submissions")
        .select("*, tasks(xp_reward)")
        .eq("id", submission_id)
        .limit(1)
        .execute()
    )
    if not sub.data:
        raise HTTPException(404, "Submission not found.")

    submission = sub.data[0]
    xp = grade.xp_awarded if grade.xp_awarded is not None else submission["tasks"]["xp_reward"]

    sb.table("task_submissions").update({
        "status":     grade.status,
        "feedback":   grade.feedback,
        "graded_at":  datetime.now(timezone.utc).isoformat(),
        "xp_awarded": xp if grade.status == "approved" else 0,
    }).eq("id", submission_id).execute()

    # Award XP if approved
    if grade.status == "approved":
        sb.table("xp_ledger").insert({
            "member_id": submission["member_id"],
            "delta":     xp,
            "reason":    "task_approved",
            "ref_id":    submission["task_id"],
        }).execute()

    return {"success": True}
