"""
Main application entry point for the AI Interviewer Agent.
Initializes the FastAPI application and routes.
"""

import os
import logging
import json
import sys
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from dotenv import load_dotenv

load_dotenv()


def setup_logging():
    """Setup structured JSON logging for production, plain text for local dev."""
    log_level_str = os.environ.get("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    class JSONFormatter(logging.Formatter):
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
            if record.exc_info:
                log_entry["exception"] = self.formatException(record.exc_info)
            if hasattr(record, "session_id"):
                log_entry["session_id"] = record.session_id
            if hasattr(record, "user_id"):
                log_entry["user_id"] = record.user_id
            if hasattr(record, "request_id"):
                log_entry["request_id"] = record.request_id
            return json.dumps(log_entry)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    is_production = os.environ.get("WEBSITES_PORT") is not None

    if is_production:
        formatter = JSONFormatter()
        handler = logging.StreamHandler(sys.stdout)
    else:
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler = logging.StreamHandler()

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    return logging.getLogger(__name__)


logger = setup_logging()

app = FastAPI(
    title="AI Interviewer Agent",
    description="AI-powered interview practice and coaching system",
    version="0.1.0",
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with structured logging."""
    logger.error(
        "Unhandled exception during request processing",
        extra={
            "request_info": {
                "method": request.method,
                "url": str(request.url),
            },
            "exception_type": type(exc).__name__
        },
        exc_info=exc,
    )
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

# --- Router registration (added by other members' PRs) ---
# A2 adds: create_auth_api(app), create_file_processing_api(app)
# A4 adds: create_speech_api(app)
# A5 adds: create_agent_api(app)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "status": "ok",
        "message": "AI Interviewer Agent is running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "0.1.0",
    }


logger.info("Application setup complete. Waiting for Uvicorn server start...")

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run("backend.main:app", host=host, port=port)
