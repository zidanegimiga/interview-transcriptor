from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DBDep
from app.models.common import ok
from app.models.template import CreateTemplateRequest, UpdateTemplateRequest

router = APIRouter(prefix="/templates", tags=["Templates"])


def _serialize(doc: dict) -> dict:
    """Convert ObjectId fields to strings for JSON serialisation."""
    doc["_id"] = str(doc["_id"])
    if doc.get("user_id"):
        doc["user_id"] = str(doc["user_id"])
    return doc


@router.get("")
async def list_templates(user: CurrentUser, db: DBDep):
    """Return system templates + the current user's own templates."""
    cursor = db["interview_templates"].find(
        {"$or": [{"is_system": True}, {"user_id": user["id"]}]}
    )
    docs = await cursor.to_list(length=100)
    return ok([_serialize(d) for d in docs])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: CreateTemplateRequest,
    user: CurrentUser,
    db: DBDep,
):
    now = datetime.now(timezone.utc)
    document = {
        "user_id": user["id"],
        "name": payload.name,
        "description": payload.description,
        "prompt": payload.prompt,
        "focus_areas": payload.focus_areas,
        "is_system": False,
        "created_at": now,
    }
    result = await db["interview_templates"].insert_one(document)
    document["_id"] = str(result.inserted_id)
    document["user_id"] = str(document["user_id"])
    return ok(document)


@router.put("/{template_id}")
async def update_template(
    template_id: str,
    payload: UpdateTemplateRequest,
    user: CurrentUser,
    db: DBDep,
):
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template ID.")

    template = await db["interview_templates"].find_one({"_id": oid})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    if template.get("is_system"):
        raise HTTPException(status_code=403, detail="System templates cannot be modified.")
    if str(template.get("user_id")) != user["id"]:
        raise HTTPException(status_code=403, detail="You do not own this template.")

    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    await db["interview_templates"].update_one({"_id": oid}, {"$set": updates})
    updated = await db["interview_templates"].find_one({"_id": oid})
    return ok(_serialize(updated))


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    user: CurrentUser,
    db: DBDep,
):
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid template ID.")

    template = await db["interview_templates"].find_one({"_id": oid})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    if template.get("is_system"):
        raise HTTPException(status_code=403, detail="System templates cannot be deleted.")
    if str(template.get("user_id")) != user["id"]:
        raise HTTPException(status_code=403, detail="You do not own this template.")

    await db["interview_templates"].delete_one({"_id": oid})
    return ok()
    