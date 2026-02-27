from fastapi import APIRouter

from app.core.deps import CurrentUser

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get("")
async def list_templates(user: CurrentUser):
    return {"data": []}


@router.post("")
async def create_template(user: CurrentUser):
    return {"message": "create template — Stage 5"}


@router.put("/{template_id}")
async def update_template(template_id: str, user: CurrentUser):
    return {"message": f"update {template_id} — Stage 5"}


@router.delete("/{template_id}")
async def delete_template(template_id: str, user: CurrentUser):
    return {"message": f"delete {template_id} — Stage 5"}
