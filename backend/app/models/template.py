from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class InterviewTemplate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id:          str = Field(alias="_id")
    user_id:     str | None = None
    name:        str
    description: str
    prompt:      str
    focus_areas: list[str] = []
    is_system:   bool = False
    created_at:  datetime

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def stringify_objectid(cls, v: Any) -> str | None:
        if v is None:
            return None
        return str(v)


class CreateTemplateRequest(BaseModel):
    name:        str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    prompt:      str = Field(..., min_length=10)
    focus_areas: list[str] = []


class UpdateTemplateRequest(BaseModel):
    name:        str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, min_length=1, max_length=500)
    prompt:      str | None = Field(None, min_length=10)
    focus_areas: list[str] | None = None
