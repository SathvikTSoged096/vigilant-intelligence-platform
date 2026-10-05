from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)

from database.base import Base
from config import settings
from models.user import User
from models.document import Document, AuditLog
from database.base import Base

engine=create_async_engine(settings.DATABASE_URL,pool_pre_ping=True,pool_size=10,max_overflow=20)
SessionLocal=async_sessionmaker(engine,class_=AsyncSession,expire_on_commit=False)
async def get_db()->AsyncGenerator[AsyncSession,None]:
 async with SessionLocal() as s: yield s
async def init_db():

 async with engine.begin() as c: await c.run_sync(Base.metadata.create_all)
async def dispose_db(): await engine.dispose()
