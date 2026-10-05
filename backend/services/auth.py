from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from core.security import (
    verify_password,
    create_access_token,
    hash_password,
)


async def authenticate(
    db: AsyncSession,
    username: str,
    password: str,
):
    result = await db.execute(
        select(User).where(User.username == username)
    )

    user = result.scalar_one_or_none()

    if user and verify_password(password, user.password_hash):
        return create_access_token(user.id)

    return None


async def get_user(
    db: AsyncSession,
    user_id: int,
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    return result.scalar_one_or_none()


async def ensure_demo_user(db: AsyncSession):
    result = await db.execute(
        select(User).where(User.username == "operator")
    )

    if not result.scalar_one_or_none():
        db.add(
            User(
                username="operator",
                password_hash=hash_password("change-me"),
                clearance="LEVEL_1",
            )
        )

        await db.commit()


async def create_user(
    db: AsyncSession,
    user,
):
    result = await db.execute(
        select(User).where(User.username == user.username)
    )

    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise ValueError("Username already exists")

    new_user = User(
        username=user.username,
        password_hash=hash_password(user.password),
        clearance=user.clearance,
    )

    db.add(new_user)

    await db.commit()
    await db.refresh(new_user)

    return new_user