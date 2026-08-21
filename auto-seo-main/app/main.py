"""FastAPI application entry point."""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import set_key
from pydantic import BaseModel

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import update

from app.aeo.routes import router as aeo_router
from app.brand.routes import router as brand_router
from app.cache import cache
from app.config import settings
from app.db import async_session, init_db
from app.job.models import Job, JobStatus
from app.job.routes import router as jobs_router

log = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

_ACTIVE_STATUSES = (
    JobStatus.RESEARCHING, JobStatus.PLANNING, JobStatus.GENERATING,
    JobStatus.SCORING, JobStatus.REVIEWING, JobStatus.EDITING,
)

STATIC_DIR = Path(__file__).parent.parent / "static"


async def _recover_orphaned_jobs() -> None:
    """Mark jobs left in active states as FAILED so they can be resumed."""
    async with async_session() as session:
        result = await session.execute(
            update(Job)
            .where(Job.status.in_(_ACTIVE_STATUSES))
            .values(status=JobStatus.FAILED, error="Recovered: server restarted mid-pipeline")
            .returning(Job.id)
        )
        recovered = result.scalars().all()
        await session.commit()
        if recovered:
            log.info("Recovered %d orphaned job(s): %s", len(recovered), recovered)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await cache.connect()
    await _recover_orphaned_jobs()
    yield
    await cache.close()


app = FastAPI(
    title="SEO Article Generator",
    description="Backend service for generating SEO-optimized articles",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router, prefix="/api")
app.include_router(brand_router, prefix="/api")
app.include_router(aeo_router, prefix="/api")

class APISettings(BaseModel):
    anthropic_key: str | None = None
    serpapi_key: str | None = None

@app.post("/api/settings")
async def update_api_settings(new_settings: APISettings):
    """Update API keys dynamically and save them to .env."""
    env_path = Path(__file__).parent.parent / ".env"
    
    if new_settings.anthropic_key:
        os.environ["ANTHROPIC_API_KEY"] = new_settings.anthropic_key
        settings.anthropic_api_key = new_settings.anthropic_key
        if env_path.exists():
            set_key(str(env_path), "ANTHROPIC_API_KEY", new_settings.anthropic_key)
            
    if new_settings.serpapi_key:
        os.environ["SERPAPI_KEY"] = new_settings.serpapi_key
        settings.serpapi_key = new_settings.serpapi_key
        if env_path.exists():
            set_key(str(env_path), "SERPAPI_KEY", new_settings.serpapi_key)
            
    return {"status": "success", "message": "Настройки успешно сохранены"}


# Serve static files (frontend assets)
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def serve_ui():
    """Serve the frontend SPA."""
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"message": "SEO Article Generator API", "docs": "/docs", "api": "/api/jobs/"}
