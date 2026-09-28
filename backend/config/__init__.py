"""
Configuration management for our AI Interviewer platform.
Provides centralized configuration, logging setup, environment diagnostics,
and Amazon Nova 2 Sonic voice engine parameters.

Authored strictly from our team's engineering perspective for Project 08.
"""

import os
import sys
import logging
from typing import Optional, Dict, Any

# Primary Amazon Nova 2 Sonic Configuration
NOVA_SONIC_MODEL_ID = os.getenv("NOVA_SONIC_MODEL_ID", "amazon.nova-2-sonic-v1:0")
NOVA_SONIC_VOICE_ID = os.getenv("NOVA_SONIC_VOICE_ID", "arjun")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")


def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger for our specified module.
    Uses the root logger configuration set in main.py.
    """
    return logging.getLogger(name)


def create_session_logger(name: str, session_id: Optional[str] = None, 
                         user_id: Optional[str] = None) -> logging.Logger:
    """
    Create a logger with session context for enhanced debugging.
    """
    logger = logging.getLogger(name)
    
    class SessionLoggerAdapter(logging.LoggerAdapter):
        def process(self, msg, kwargs):
            extra = kwargs.get('extra', {})
            if session_id:
                extra['session_id'] = session_id
            if user_id:
                extra['user_id'] = user_id
            kwargs['extra'] = extra
            return msg, kwargs
    
    return SessionLoggerAdapter(logger, {})


def get_environment_info() -> Dict[str, Any]:
    """
    Get current environment diagnostic information including voice engine parameters.
    """
    is_azure = os.environ.get("WEBSITES_PORT") is not None
    voice_provider = os.getenv("VOICE_PROVIDER", "gemini").lower()
    has_aws_keys = bool(os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"))
    has_gemini_key = bool(os.getenv("GEMINI_VOICE_API_KEY") and not os.getenv("GEMINI_VOICE_API_KEY", "").startswith("your_"))

    if voice_provider == "gemini":
        voice_info = {
            "primary": "google.gemini-live",
            "model_id": os.getenv("GEMINI_VOICE_MODEL", "gemini-3.8-live"),
            "voice_id": os.getenv("GEMINI_VOICE_NAME", "Aoede"),
            "region": "global",
            "configured": has_gemini_key
        }
    else:
        voice_info = {
            "primary": "amazon.nova-2-sonic-v1:0",
            "model_id": os.getenv("NOVA_SONIC_MODEL_ID", "amazon.nova-2-sonic-v1:0"),
            "voice_id": os.getenv("NOVA_SONIC_VOICE_ID", "arjun"),
            "region": os.getenv("AWS_REGION", "us-east-1"),
            "configured": has_aws_keys
        }

    return {
        "is_azure": is_azure,
        "environment": "azure" if is_azure else "local",
        "python_version": sys.version.split()[0],
        "has_aws_region": bool(os.getenv("AWS_REGION")),
        "has_aws_keys": has_aws_keys,
        "voice_provider": voice_provider,
        "voice_engine": voice_info
    }


__all__ = [
    'get_logger',
    'create_session_logger',
    'get_environment_info',
    'NOVA_SONIC_MODEL_ID',
    'NOVA_SONIC_VOICE_ID',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'settings',
]

# ── Team-B Settings — shared config for coding platform endpoints ──
from pydantic import BaseModel as _BaseModel

class _Settings(_BaseModel):
    PROJECT_NAME: str = "Project 08 - AI Mock Interview & Assessment Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./project08.db")
    QUESTION_BANK_DATABASE_URL: str = os.getenv("QUESTION_BANK_DATABASE_URL", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "project08-super-secure-production-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    JUDGE0_URL: str = os.getenv("JUDGE0_URL", "https://judge0-ce.p.rapidapi.com")
    JUDGE0_API_KEY: str = os.getenv("JUDGE0_API_KEY", "")
    EXECUTION_CPU_TIMEOUT: float = 2.0
    EXECUTION_MEMORY_LIMIT: int = 128000
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

settings = _Settings()