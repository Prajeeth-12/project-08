"""
NovaSonicVoiceEngine - Primary Real-Time Voice and Conversation Engine.
Orchestrates bidirectional streaming with Amazon Nova 2 Sonic (amazon.nova-2-sonic-v1:0),
handling session lifecycle, audio chunking, real-time transcripts, barge-in / interruption,
and 8-minute stream renewal without losing interview state.

Authored strictly from our team's engineering perspective for Project 08.
"""
import os
import sys
import json
import uuid
import time
import asyncio
import logging
from typing import Dict, Any, Optional, Callable, Awaitable

from backend.config import (
    NOVA_SONIC_MODEL_ID,
    NOVA_SONIC_VOICE_ID,
    AWS_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    get_logger
)

logger = get_logger("NovaSonicVoiceEngine")

# Path to the standalone worker script
WORKER_SCRIPT_PATH = os.path.join(os.path.dirname(__file__), "nova_sonic_worker.py")


class NovaSonicSession:
    """
    Represents an active Nova 2 Sonic connection for an interview session.
    Manages the background worker process and multiplexes bidirectional audio/event streams.
    """

    def __init__(
        self,
        session_id: str,
        system_prompt: str = "",
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None,
        region: Optional[str] = None,
        on_audio: Optional[Callable[[str], Awaitable[None]]] = None,
        on_transcript: Optional[Callable[[str, str, bool], Awaitable[None]]] = None,
        on_barge_in: Optional[Callable[[], Awaitable[None]]] = None,
        on_turn_ended: Optional[Callable[[str], Awaitable[None]]] = None,
        on_renewed: Optional[Callable[[], Awaitable[None]]] = None,
        on_error: Optional[Callable[[str], Awaitable[None]]] = None,
    ):
        self.session_id = session_id
        self.system_prompt = system_prompt
        self.voice_id = voice_id or NOVA_SONIC_VOICE_ID
        self.model_id = model_id or NOVA_SONIC_MODEL_ID
        self.region = region or AWS_REGION
        self.on_audio = on_audio
        self.on_transcript = on_transcript
        self.on_barge_in = on_barge_in
        self.on_turn_ended = on_turn_ended
        self.on_renewed = on_renewed
        self.on_error = on_error

        self.proc: Optional[asyncio.subprocess.Process] = None
        self.reader_task: Optional[asyncio.Task] = None
        self.is_connected = False
        self.is_closing = False
        self.start_time = time.time()
        self.active_provider = "amazon.nova-2-sonic-v1:0"

    async def start(self) -> bool:
        """Spawn the Python 3.13 Nova Sonic worker and initialize the stream."""
        logger.info(f"Starting Nova Sonic voice session {self.session_id} with model {self.model_id}...")

        # Determine python executable (prefer py -3.13 or Python 3.13 path)
        py_cmd = ["py", "-3.13"]
        if sys.platform != "win32":
            py_cmd = ["python3"]

        try:
            self.proc = await asyncio.create_subprocess_exec(
                *py_cmd,
                WORKER_SCRIPT_PATH,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            # Start reading stdout from the worker
            self.reader_task = asyncio.create_task(self._read_worker_output())

            # Send initialization payload
            init_payload = {
                "action": "init",
                "session_id": self.session_id,
                "model_id": self.model_id,
                "voice_id": self.voice_id,
                "region": self.region,
                "system_prompt": self.system_prompt,
                "aws_access_key_id": os.getenv("AWS_ACCESS_KEY_ID", AWS_ACCESS_KEY_ID),
                "aws_secret_access_key": os.getenv("AWS_SECRET_ACCESS_KEY", AWS_SECRET_ACCESS_KEY)
            }
            await self._send_to_worker(init_payload)
            self.is_connected = True
            return True

        except Exception as e:
            logger.error(f"Failed to launch Nova Sonic worker process: {e}")
            if self.on_error:
                await self.on_error(f"Failed to initialize Nova Sonic: {str(e)}")
            return False

    async def _send_to_worker(self, data: Dict[str, Any]):
        """Write a JSON line to worker stdin."""
        if not self.proc or not self.proc.stdin or self.proc.stdin.is_closing():
            return
        try:
            line = json.dumps(data) + "\n"
            self.proc.stdin.write(line.encode("utf-8"))
            await self.proc.stdin.drain()
        except Exception as e:
            logger.error(f"Error writing to Nova Sonic worker stdin: {e}")

    async def _read_worker_output(self):
        """Consume JSON lines from the worker stdout and trigger registered callbacks."""
        if not self.proc or not self.proc.stdout:
            return

        while not self.is_closing:
            try:
                line_bytes = await self.proc.stdout.readline()
                if not line_bytes:
                    break

                line_str = line_bytes.decode("utf-8").strip()
                if not line_str:
                    continue

                try:
                    event = json.loads(line_str)
                except json.JSONDecodeError:
                    continue

                event_type = event.get("type")

                if event_type == "audio":
                    audio_b64 = event.get("data", "")
                    if audio_b64 and self.on_audio:
                        await self.on_audio(audio_b64)

                elif event_type == "transcript":
                    text = event.get("text", "")
                    role = event.get("role", "assistant")
                    is_final = event.get("is_final", False)
                    if text and self.on_transcript:
                        await self.on_transcript(text, role, is_final)

                elif event_type == "barge_in":
                    logger.info("Barge-in / interruption detected from candidate.")
                    if self.on_barge_in:
                        await self.on_barge_in()

                elif event_type == "turn_ended":
                    stop_reason = event.get("stop_reason", "END_TURN")
                    if self.on_turn_ended:
                        await self.on_turn_ended(stop_reason)

                elif event_type == "error":
                    msg = event.get("message", "Unknown Nova Sonic error")
                    logger.warning(f"Nova Sonic worker reported error: {msg}")
                    if self.on_error:
                        await self.on_error(msg)

                elif event_type == "renewed":
                    logger.info(f"Nova Sonic worker renewed connection for session {self.session_id}")
                    if self.on_renewed:
                        await self.on_renewed()

                elif event_type == "warning":
                    msg = event.get("message", "Unknown warning")
                    logger.warning(f"Nova Sonic worker warning: {msg}")
                    if self.on_error:
                        await self.on_error(f"[WARNING] {msg}")

                elif event_type == "ready":
                    logger.info(f"Nova Sonic worker ready for session {self.session_id}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in Nova Sonic output listener: {e}")
                break

    async def send_audio_chunk(self, base64_audio: str):
        """Forward an incoming PCM audio chunk from the client into the worker."""
        if not self.is_connected or self.is_closing:
            return
        await self._send_to_worker({
            "action": "audio",
            "data": base64_audio
        })

    async def renew_connection(self):
        """Signal the worker to renew the 8-minute Bedrock connection."""
        logger.info(f"Requesting connection renewal for session {self.session_id}...")
        await self._send_to_worker({"action": "renew"})

    async def stop(self):
        """Gracefully stop the session and terminate the worker."""
        self.is_closing = True
        self.is_connected = False
        try:
            await self._send_to_worker({"action": "stop"})
        except Exception:
            pass

        if self.reader_task and not self.reader_task.done():
            self.reader_task.cancel()

        if self.proc:
            try:
                self.proc.terminate()
                await asyncio.wait_for(self.proc.wait(), timeout=2.0)
            except Exception:
                try:
                    self.proc.kill()
                except Exception:
                    pass


class NovaSonicVoiceEngine:
    """
    Central service managing Nova 2 Sonic sessions across all active interviews.
    Provides health diagnostics, session lifecycle control, and real-time audio routing.
    """

    def __init__(self):
        self._active_sessions: Dict[str, NovaSonicSession] = {}
        self.model_id = NOVA_SONIC_MODEL_ID
        self.voice_id = NOVA_SONIC_VOICE_ID
        self.region = AWS_REGION

    def is_configured(self) -> bool:
        """Check if AWS credentials are configured for Bedrock Nova Sonic."""
        key = os.getenv("AWS_ACCESS_KEY_ID", AWS_ACCESS_KEY_ID)
        secret = os.getenv("AWS_SECRET_ACCESS_KEY", AWS_SECRET_ACCESS_KEY)
        return bool(key and secret)

    def get_status(self) -> Dict[str, Any]:
        """Return engine status for /health endpoint."""
        configured = self.is_configured()
        return {
            "status": "ready" if configured else "credentials_needed",
            "provider": "amazon_bedrock",
            "model_id": self.model_id,
            "voice_id": self.voice_id,
            "region": self.region,
            "active_streams": len(self._active_sessions),
            "transport": "HTTP2_duplex_CRT",
            "turn_detection": "native_bidi",
            "connection_limit": "8m_auto_renewal"
        }

    async def create_session(
        self,
        session_id: str,
        system_prompt: str = "",
        voice_id: Optional[str] = None,
        on_audio: Optional[Callable[[str], Awaitable[None]]] = None,
        on_transcript: Optional[Callable[[str, str, bool], Awaitable[None]]] = None,
        on_barge_in: Optional[Callable[[], Awaitable[None]]] = None,
        on_turn_ended: Optional[Callable[[str], Awaitable[None]]] = None,
        on_renewed: Optional[Callable[[], Awaitable[None]]] = None,
        on_error: Optional[Callable[[str], Awaitable[None]]] = None,
    ) -> NovaSonicSession:
        """Create and start a new Nova Sonic voice session."""
        # Clean up existing session for same ID if present
        if session_id in self._active_sessions:
            await self._active_sessions[session_id].stop()

        session = NovaSonicSession(
            session_id=session_id,
            system_prompt=system_prompt,
            voice_id=voice_id or self.voice_id,
            model_id=self.model_id,
            region=self.region,
            on_audio=on_audio,
            on_transcript=on_transcript,
            on_barge_in=on_barge_in,
            on_turn_ended=on_turn_ended,
            on_renewed=on_renewed,
            on_error=on_error
        )
        self._active_sessions[session_id] = session
        await session.start()
        return session

    def get_session(self, session_id: str) -> Optional[NovaSonicSession]:
        """Retrieve an active session by session ID."""
        return self._active_sessions.get(session_id)

    async def close_session(self, session_id: str):
        """Close and remove an active session."""
        session = self._active_sessions.pop(session_id, None)
        if session:
            await session.stop()


# Global singleton instance
_engine_instance: Optional[NovaSonicVoiceEngine] = None


def get_nova_sonic_engine() -> NovaSonicVoiceEngine:
    """Get or create the global NovaSonicVoiceEngine instance."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = NovaSonicVoiceEngine()
    return _engine_instance
