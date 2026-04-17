from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI

logger = logging.getLogger(__name__)

from migrations import migrate_database_on_startup
from services.database import create_db_and_tables, dispose_engines
from utils.get_env import get_app_data_directory_env
from utils.model_availability import (
    check_llm_and_image_provider_api_or_model_availability,
)


@asynccontextmanager
async def app_lifespan(_: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Initializes the application data directory, runs Alembic migrations when
    MIGRATE_DATABASE_ON_STARTUP=true, creates any missing tables, and checks
    LLM model availability.
    """
    logger.info("Starting FastAPI application lifespan...")
    app_data_dir = get_app_data_directory_env() or "/app_data"
    logger.debug(f"Ensuring app data directory exists: {app_data_dir}")
    os.makedirs(app_data_dir, exist_ok=True)
    
    logger.info("Running database migrations...")
    try:
        await migrate_database_on_startup()
    except Exception as exc:
        logger.error("Failed running database migrations", exc_info=True)
        raise
        logger.info("Creating database tables...")
        try:
            await create_db_and_tables()
        except Exception as exc:
            logger.error("Failed creating database tables", exc_info=True)
            raise
        logger.info("Checking LLM and Image Provider availability...")
        try:
            await check_llm_and_image_provider_api_or_model_availability()
        except Exception as exc:
            logger.error("Failed checking LLM and Image Provider availability", exc_info=True)
            raise

        logger.info("Lifespan initialization complete.")
        logger.info("=== FASTAPI STARTUP SUCCESSFUL - Server ready to accept requests on 127.0.0.1:8000 ===")
    yield
    # Shutdown: release all database connections to prevent stale/leaked pools.
    await dispose_engines()
