"""
Speech API module for handling Text-to-Speech functionality and WebSocket processing.
"""

from .connection_manager import ConnectionManager
from .websocket_processor import WebSocketMessageProcessor
from .tts_service import TTSService

__all__ = [
    'ConnectionManager',
    'WebSocketMessageProcessor',
    'TTSService',
]
