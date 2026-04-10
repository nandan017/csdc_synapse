from pydantic import BaseModel, EmailStr, field_validator
from typing import Literal


class ApplicationRequest(BaseModel):
    firstName:    str
    lastName:     str
    email:        EmailStr
    phone:        str
    year:         Literal["1", "2", "3"]
    section:      Literal["A", "B", "C"]
    password:     str
    linkedin:     str
    github:       str
    tshirtSize:   Literal["S", "M", "L", "XL", "XXL"]
    whyJoin:      str
    suggestions:  str = ""

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("phone")
    @classmethod
    def phone_digits(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 10:
            raise ValueError("Phone number must have at least 10 digits")
        return v

    @field_validator("firstName", "lastName", "whyJoin")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("This field cannot be empty")
        return v.strip()


class ApplicationResponse(BaseModel):
    success: bool
    message: str
