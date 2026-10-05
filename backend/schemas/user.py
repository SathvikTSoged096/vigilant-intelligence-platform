from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    clearance: str = "LEVEL 1"


class UserResponse(BaseModel):
    id: int
    username: str
    clearance: str

    model_config = {
        "from_attributes": True
    }