from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database.postgres import init_db, dispose_db, SessionLocal
from database.neo4j import neo4j_client
from services.auth import ensure_demo_user
from api.auth import router as auth_router
from api.documents import router as documents_router
from api.graph import router as graph_router
from api.reports import router as reports_router
from api.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await neo4j_client.verify()

    async with SessionLocal() as db:
        await ensure_demo_user(db)

    yield

    await neo4j_client.close()
    await dispose_db()


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [
    auth_router,
    documents_router,
    graph_router,
    users_router,
    reports_router,
]:
    app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
    }