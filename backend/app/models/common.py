import math
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    pages: int


class ApiResponse(BaseModel, Generic[T]):
    data: T
    meta: PaginationMeta | None = None


def ok(data: object, meta: PaginationMeta | None = None) -> dict:
    result: dict = {"data": data}
    if meta:
        result["meta"] = meta.model_dump()
    return result


def paginate(page: int, limit: int, total: int) -> PaginationMeta:
    return PaginationMeta(
        page=page,
        limit=limit,
        total=total,
        pages=math.ceil(total / limit) if limit > 0 else 0,
    )