from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.supabase_service import get_supabase

router = APIRouter(prefix="/vault", tags=["vault"])


class ResourceCreate(BaseModel):
    title:       str
    description: str
    category:    str          # "workshop", "project", "tool", "reference", "template"
    url:         str          # GitHub link, Notion page, Drive link, etc.
    tags:        list[str] = []
    is_public:   bool = True   # False = members only


@router.get("/")
def list_resources(
    category: Optional[str] = Query(None),
    search:   Optional[str] = Query(None),
    tag:      Optional[str] = Query(None),
):
    sb = get_supabase()
    q = sb.table("resources").select(
        "id, title, description, category, url, tags, "
        "is_public, view_count, created_at, "
        "members(first_name, last_name)"
    ).eq("is_public", True)

    if category: q = q.eq("category", category)
    if search:   q = q.ilike("title", f"%{search}%")

    rows = q.order("created_at", desc=True).execute()
    data = rows.data or []

    # Filter by tag client-side (Supabase array contains)
    if tag:
        data = [r for r in data if tag in (r.get("tags") or [])]

    return {"data": data}


@router.get("/{resource_id}")
def get_resource(resource_id: str):
    sb = get_supabase()
    row = (
        sb.table("resources")
        .select("*, members(first_name, last_name)")
        .eq("id", resource_id)
        .limit(1)
        .execute()
    )
    if not row.data:
        raise HTTPException(404, "Resource not found.")

    # Increment view count
    sb.table("resources").update({
        "view_count": (row.data[0].get("view_count") or 0) + 1
    }).eq("id", resource_id).execute()

    return row.data[0]


@router.post("/")
def create_resource(r: ResourceCreate, uploader_id: str):
    """uploader_id = member.id, passed from frontend after auth."""
    sb = get_supabase()

    row = sb.table("resources").insert({
        "title":       r.title,
        "description": r.description,
        "category":    r.category,
        "url":         r.url,
        "tags":        r.tags,
        "is_public":   r.is_public,
        "uploaded_by": uploader_id,
        "view_count":  0,
        "created_at":  datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {"success": True, "data": row.data[0]}


@router.delete("/{resource_id}")
def delete_resource(resource_id: str):
    sb = get_supabase()
    sb.table("resources").delete().eq("id", resource_id).execute()
    return {"success": True}
