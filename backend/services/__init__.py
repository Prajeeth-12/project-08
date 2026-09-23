"""
Services module initialization.
Provides initialization functions for creating and configuring service instances.
Refactored for multi-session support with database persistence and API rate limiting.
"""

import os
import logging
from typing import Optional, TYPE_CHECKING

from backend.utils.event_bus import EventBus
from backend.services.search_service import SearchService
from backend.services.llm_service import LLMService
from backend.database.db_manager import DatabaseManager
from backend.database.mock_db_manager import MockDatabaseManager
from backend.services.rate_limiting import APIRateLimiter
from backend.config import get_logger

if TYPE_CHECKING:
    from backend.services.session_manager import ThreadSafeSessionRegistry

logger = get_logger(__name__)

_llm_service: Optional[LLMService] = None
_event_bus: Optional[EventBus] = None
_search_service: Optional[SearchService] = None
_database_manager: Optional[DatabaseManager] = None
_session_registry: Optional["ThreadSafeSessionRegistry"] = None
_rate_limiter: Optional[APIRateLimiter] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        logger.info("Creating singleton LLMService instance...")
        _llm_service = LLMService()
        logger.info("Singleton LLMService instance created.")
    return _llm_service


def get_event_bus() -> EventBus:
    global _event_bus
    if _event_bus is None:
        logger.info("Creating singleton EventBus instance...")
        _event_bus = EventBus()
        logger.info("Singleton EventBus instance created.")
    return _event_bus


def get_search_service() -> SearchService:
    global _search_service
    if _search_service is None:
        logger.info("Creating singleton SearchService instance...")
        _search_service = SearchService()
        logger.info("Singleton SearchService instance created.")
    return _search_service


def get_database_manager() -> DatabaseManager:
    if _database_manager is None:
        raise RuntimeError("Database manager not initialized. Call initialize_services() first.")
    return _database_manager


def get_session_registry() -> "ThreadSafeSessionRegistry":
    if _session_registry is None:
        raise RuntimeError("Session registry not initialized. Call initialize_services() first.")
    return _session_registry


def get_rate_limiter() -> APIRateLimiter:
    global _rate_limiter
    if _rate_limiter is None:
        logger.info("Creating singleton APIRateLimiter instance...")
        _rate_limiter = APIRateLimiter()
        logger.info("Singleton APIRateLimiter instance created.")
    return _rate_limiter


async def initialize_services() -> None:
    """Initialize all application services with session cleanup."""
    global _database_manager, _session_registry

    from backend.services.session_manager import ThreadSafeSessionRegistry

    try:
        use_mock_auth = os.environ.get("USE_MOCK_AUTH", "false").lower() == "true"

        if use_mock_auth:
            logger.info("Initializing with MockDatabaseManager for development")
            _database_manager = MockDatabaseManager()
        else:
            logger.info("Initializing with real DatabaseManager (Supabase)")
            _database_manager = DatabaseManager()

        llm_service = get_llm_service()
        event_bus = get_event_bus()

        _session_registry = ThreadSafeSessionRegistry(
            db_manager=_database_manager,
            llm_service=llm_service,
            event_bus=event_bus
        )

        await _session_registry.start_cleanup_task()

        logger.info("Services initialized successfully with session cleanup task started")

    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
