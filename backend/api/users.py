from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import get_db
from schemas.user import UserCreate, UserResponse
from services.auth import create_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserResponse)
async def create_new_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_user(db, user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))