import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import interviews, templates, webhooks, websocket
from app.core.config import settings
from app.core.database import connect_db, disconnect_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — environment: %s", settings.ENVIRONMENT)
    await connect_db()
    yield
    await disconnect_db()


def create_app() -> FastAPI:
    is_dev = settings.ENVIRONMENT != "production"

    app = FastAPI(
        title="HR Interview Analysis Platform",
        version="1.0.0",
        docs_url="/api/docs" if is_dev else None,
        redoc_url="/api/redoc" if is_dev else None,
        openapi_url="/api/openapi.json" if is_dev else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = "/api/v1"
    app.include_router(interviews.router, prefix=prefix)
    app.include_router(templates.router,  prefix=prefix)
    app.include_router(webhooks.router,   prefix=prefix)
    app.include_router(websocket.router,  prefix=prefix)

    @app.get("/api/v1/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
        }

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"message": exc.detail}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception on %s %s", request.method, request.url)
        return JSONResponse(
            status_code=500,
            content={"error": {"message": "An unexpected error occurred."}},
        )

    return app


app = create_app()
