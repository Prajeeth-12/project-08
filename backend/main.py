"""
Main application entry point for the AI Interviewer Agent.
Initializes the FastAPI application and routes.
"""

import os
import logging
import tempfile
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path
import json
import sys
from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Pydantic imports
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Ensure parent directory is in sys.path so 'import backend' works seamlessly
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

# LangChain 1.x compatibility shim
try:
    import langchain.chains
except ImportError:
    try:
        import langchain_classic.chains
        sys.modules['langchain.chains'] = langchain_classic.chains
        import langchain_classic.chains.base
        sys.modules['langchain.chains.base'] = langchain_classic.chains.base
    except ImportError:
        pass

try:
    import langchain.prompts
except ImportError:
    try:
        import langchain_core.prompts
        sys.modules['langchain.prompts'] = langchain_core.prompts
    except ImportError:
        pass

# Local imports
from backend.services import initialize_services, get_session_registry, get_rate_limiter
from backend.api.agent_api import create_agent_api
from backend.api.speech_api import create_speech_api
from backend.api.file_processing_api import create_file_processing_api
from backend.api.auth_api import create_auth_api

from backend.middleware import SessionSavingMiddleware
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path) if os.path.exists(env_path) else load_dotenv()

# Enhanced Azure-compatible logging setup
def setup_azure_logging():
    """Setup structured JSON logging for Azure Container Apps."""
    log_level_str = os.environ.get("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)
    
    # Create custom JSON formatter for Azure
    class AzureJSONFormatter(logging.Formatter):
        def format(self, record):
            log_entry = {
                "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%fZ"),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno
            }
            
            # Add exception info if present
            if record.exc_info:
                log_entry["exception"] = self.formatException(record.exc_info)
            
            # Add extra fields if present
            if hasattr(record, "session_id"):
                log_entry["session_id"] = record.session_id
            if hasattr(record, "user_id"):
                log_entry["user_id"] = record.user_id
            if hasattr(record, "request_id"):
                log_entry["request_id"] = record.request_id
                
            return json.dumps(log_entry)

    # Clear existing handlers
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    # Use JSON formatter for Azure, plain text for local development
    is_azure = os.environ.get("WEBSITES_PORT") is not None
    
    if is_azure:
        # Azure Container Apps - use JSON formatting
        formatter = AzureJSONFormatter()
        handler = logging.StreamHandler(sys.stdout)
    else:
        # Local development - use plain text formatting
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler = logging.StreamHandler()
    
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
    
    return logging.getLogger(__name__)

# Initialize logging
logger = setup_azure_logging()
logger.info(f"Logging configured for {'Azure' if os.environ.get('WEBSITES_PORT') else 'local'} environment")

app = FastAPI(
    title="AI Interviewer Agent",
    description="AI-powered interview practice and coaching system",
    version="0.1.0",
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Enhanced global exception handler with structured logging."""
    request_info = {
        "method": request.method,
        "url": str(request.url),
        "headers": dict(request.headers),
        "path_params": dict(request.path_params),
        "query_params": dict(request.query_params)
    }
    
    # Log with structured data
    extra_data = {
        "request_info": request_info,
        "exception_type": type(exc).__name__
    }
    
    logger.error(f"Unhandled exception during request processing", extra=extra_data, exc_info=exc)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": f"An internal server error occurred: {str(exc)}",
            "request_id": request.headers.get("X-Request-ID", "unknown")
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session saving middleware for automatic session persistence
app.add_middleware(SessionSavingMiddleware)

# Register API routes
create_auth_api(app)
logger.info("Auth API routes registered")

create_agent_api(app)
logger.info("Agent API routes registered")

create_speech_api(app)
logger.info("Speech API routes registered")

create_file_processing_api(app)
logger.info("File Processing API routes registered")



api_key = os.environ.get("GOOGLE_API_KEY", "MISSING_API_KEY")

@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {
        "status": "ok",
        "message": "AI Interviewer Agent is running"
    }

@app.get("/health")
async def health_check():
    """Detailed health check endpoint reporting active Amazon Nova 2 Sonic engine and environment diagnostics."""
    try:
        from backend.config import get_environment_info
        from backend.api.speech_api import get_voice_engine

        session_registry = get_session_registry()
        active_sessions = await session_registry.get_active_session_count()
        memory_stats = await session_registry.get_memory_usage_stats()

        # Get environment diagnostics
        env_info = get_environment_info()
        voice_engine = get_voice_engine()
        nova_status = voice_engine.get_status()
        
        # Probe database connectivity
        db_status = "unknown"
        try:
            from backend.services import get_database_manager
            db_mgr = get_database_manager()
            if hasattr(db_mgr, 'supabase'):
                db_status = "connected"
            elif hasattr(db_mgr, 'sessions'):
                db_status = "mock"
        except Exception:
            db_status = "unavailable"

        # Probe LLM service availability
        llm_status = "unknown"
        try:
            from backend.services import get_llm_service
            llm_svc = get_llm_service()
            if llm_svc and llm_svc.api_key:
                llm_status = "configured"
            else:
                llm_status = "no_api_key"
        except Exception:
            llm_status = "unavailable"

        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "environment": env_info,
            "active_sessions": active_sessions,
            "memory_stats": memory_stats,
            "voice_engine": nova_status,
            "services": {
                "database": db_status,
                "llm_service": llm_status,
                "event_bus": "running",
                "nova_sonic_engine": nova_status
            }
        }
        
        return health_status
        
    except Exception as e:
        logger.exception(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@app.get("/metrics")
async def get_metrics():
    """Get system metrics for monitoring."""
    try:
        session_registry = get_session_registry()
        rate_limiter = get_rate_limiter()
        
        active_sessions = await session_registry.get_active_session_count()
        memory_stats = await session_registry.get_memory_usage_stats()
        rate_limit_stats = rate_limiter.get_usage_stats()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "sessions": {
                "active": active_sessions,
                **memory_stats
            },
            "rate_limits": rate_limit_stats,
            "system": {
                "version": "0.1.0",
                "status": "running"
            }
        }
    except Exception as e:
        logger.exception(f"Metrics collection failed: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Metrics collection failed",
                "timestamp": datetime.utcnow().isoformat()
            }
        )

async def warmup_services():
    """Warm up external services to reduce first-request latency."""
    logger.info("🔥 Starting comprehensive service warmup...")
    
    # Check if running in production (Azure has WEBSITES_PORT environment variable)
    is_production = os.environ.get("WEBSITES_PORT") is not None
    
    # Enhanced TTS service warmup - only in production
    try:
        from backend.api.speech.tts_service import TTSService
        tts_service = TTSService()
        
        if tts_service.is_available():
            if is_production:
                logger.info("🎤 Warming up Amazon Polly TTS service (production mode)...")
                
                # Single optimized warmup call to establish connection pool
                # Using minimal text to reduce character consumption: "Hi" = 2 characters vs previous 28
                try:
                    ssml_text = tts_service._prepare_ssml("Hi", 1.0)
                    start_time = asyncio.get_event_loop().time()
                    
                    # Run single warmup synthesis to establish connection
                    await tts_service._synthesize_speech_with_retry(ssml_text, tts_service.default_voice)
                    
                    end_time = asyncio.get_event_loop().time()
                    duration = end_time - start_time
                    logger.info(f"✅ TTS warmup completed in {duration:.2f}s (2 characters used)")
                    
                except Exception as e:
                    logger.warning(f"⚠️ TTS warmup failed: {e}")
                
                logger.info("✅ TTS service warmed up successfully")
            else:
                logger.info("⚠️ Skipping TTS warmup (development mode - cost optimization)")
        else:
            logger.warning("⚠️ TTS service not available for warmup (missing AWS credentials)")
            
    except Exception as e:
        logger.warning(f"⚠️ TTS warmup failed (service will still work on first use): {e}")
    
    # Test database connectivity
    try:
        session_registry = get_session_registry()
        if hasattr(session_registry, 'db_manager'):
            # Simple connectivity test
            stats = await session_registry.get_memory_usage_stats()
            logger.info("✅ Database connectivity verified")
    except Exception as e:
        logger.warning(f"⚠️ Database warmup check failed: {e}")
    
    logger.info("🔥 Service warmup completed")

@app.on_event("startup")
async def startup_event():
    """Application startup event handler with service warmup."""
    logger.info("🚀 Application startup...")

    try:
        await initialize_services()  # Initialize core services
        session_registry = get_session_registry()
        app.state.agent_manager = session_registry
        
        # Enhanced logging for service verification
        logger.info("📊 Service verification:")
        logger.info(f"  - SessionRegistry type: {type(session_registry).__name__}")
        logger.info(f"  - Has db_manager: {hasattr(session_registry, 'db_manager')}")
        logger.info(f"  - Has llm_service: {hasattr(session_registry, 'llm_service')}")
        logger.info(f"  - Has event_bus: {hasattr(session_registry, 'event_bus')}")
        
        # Warm up external services
        await warmup_services()
        
        logger.info("✅ Application startup completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Service initialization failed: {e}")
        logger.exception("Full startup error details:")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event handler with graceful cleanup."""
    logger.info("🛑 Application shutdown...")
    
    try:
        # Stop cleanup task and save all active sessions
        session_registry = get_session_registry()
        await session_registry.stop_cleanup_task()
        
        # Final cleanup of all active sessions
        cleaned_count = await session_registry.cleanup_inactive_sessions(max_idle_minutes=0)
        logger.info(f"💾 Shutdown: saved {cleaned_count} active sessions")
        
        logger.info("✅ Application shutdown completed successfully")
        
    except Exception as e:
        logger.exception(f"❌ Error during shutdown: {e}")

logger.info("Application setup complete. Waiting for Uvicorn server start...")

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run("backend.main:app", host=host, port=port) 