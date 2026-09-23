"""
GeminiVoiceEngine — Voice provider using Google Gemini Live API.

Drop-in alternative to NovaSonicVoiceEngine when VOICE_PROVIDER=gemini.
Produces the same callback events (on_audio, on_transcript, on_barge_in,
on_turn_ended, on_error) so the rest of the pipeline
(speech_api -> AgentSessionManager -> InterviewerAgent) works unchanged.
"""

import os
import base64
import asyncio
import logging
from typing import Dict, Any, Optional, Callable, Awaitable

from google import genai
from google.genai import types

from backend.config import get_logger

logger = get_logger("GeminiVoiceEngine")

GEMINI_VOICE_API_KEY = os.getenv("GEMINI_VOICE_API_KEY", "")
GEMINI_VOICE_MODEL = os.getenv("GEMINI_VOICE_MODEL", "gemini-3.8-live")
GEMINI_VOICE_NAME = os.getenv("GEMINI_VOICE_NAME", "Aoede")


class GeminiVoiceSession:
    """
    A voice session backed by Gemini Live API.
    Same callback interface as NovaSonicSession.
    """

    def __init__(
        self,
        session_id: str,
        system_prompt: str = "",
        voice_name: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        on_audio: Optional[Callable[[str], Awaitable[None]]] = None,
        on_transcript: Optional[Callable[[str, str, bool], Awaitable[None]]] = None,
        on_barge_in: Optional[Callable[[], Awaitable[None]]] = None,
        on_turn_ended: Optional[Callable[[str], Awaitable[None]]] = None,
        on_renewed: Optional[Callable[[], Awaitable[None]]] = None,
        on_error: Optional[Callable[[str], Awaitable[None]]] = None,
    ):
        self.session_id = session_id
        self.system_prompt = system_prompt
        self.voice_name = voice_name or GEMINI_VOICE_NAME
        self.model = model or GEMINI_VOICE_MODEL
        self.api_key = api_key or GEMINI_VOICE_API_KEY

        self.on_audio = on_audio
        self.on_transcript = on_transcript
        self.on_barge_in = on_barge_in
        self.on_turn_ended = on_turn_ended
        self.on_renewed = on_renewed
        self.on_error = on_error

        self._client: Optional[genai.Client] = None
        self._live_session = None
        self._receive_task: Optional[asyncio.Task] = None
        self.is_connected = False
        self.is_closing = False
        self.active_provider = f"gemini-live:{self.model}"

    async def start(self) -> bool:
        """Open a Gemini Live session."""
        if not self.api_key or self.api_key.startswith("your_"):
            msg = "GEMINI_VOICE_API_KEY not configured. Set it in .env."
            logger.error(msg)
            if self.on_error:
                await self.on_error(msg)
            return False

        try:
            self._client = genai.Client(api_key=self.api_key)

            config = types.LiveConnectConfig(
                response_modalities=["AUDIO", "TEXT"],
                system_instruction=types.Content(
                    parts=[types.Part(text=self.system_prompt)]
                ) if self.system_prompt else None,
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=self.voice_name
                        )
                    )
                ),
                input_audio_transcription=types.AudioTranscriptionConfig(),
                output_audio_transcription=types.AudioTranscriptionConfig(),
            )

            self._live_session = await self._client.aio.live.connect(
                model=self.model,
                config=config
            )

            self.is_connected = True
            self._receive_task = asyncio.create_task(self._receive_loop())
            logger.info(
                f"Gemini Live session started: session={self.session_id} "
                f"model={self.model} voice={self.voice_name}"
            )
            return True

        except Exception as e:
            logger.exception(f"Failed to start Gemini Live session: {e}")
            if self.on_error:
                await self.on_error(f"Failed to start Gemini voice session: {e}")
            return False

    async def _receive_loop(self):
        """Read server messages from Gemini Live and fire callbacks."""
        if not self._live_session:
            return

        try:
            async for msg in self._live_session.receive():
                if self.is_closing:
                    break

                server_content = getattr(msg, "server_content", None)
                if not server_content:
                    continue

                # --- Interruption (barge-in) ---
                if getattr(server_content, "interrupted", False):
                    if self.on_barge_in:
                        await self.on_barge_in()
                    continue

                turn_complete = getattr(server_content, "turn_complete", False)

                # --- Model audio + streaming text ---
                model_turn = getattr(server_content, "model_turn", None)
                if model_turn and hasattr(model_turn, "parts"):
                    for part in model_turn.parts:
                        # Audio data
                        inline_data = getattr(part, "inline_data", None)
                        if inline_data and getattr(inline_data, "data", None):
                            audio_b64 = base64.b64encode(inline_data.data).decode("ascii")
                            if self.on_audio:
                                await self.on_audio(audio_b64)

                        # Streaming text (partial assistant response)
                        text = getattr(part, "text", None)
                        if text and self.on_transcript:
                            await self.on_transcript(text, "assistant", False)

                # --- Input transcription (what the user said) ---
                input_tx = getattr(server_content, "input_transcription", None)
                if input_tx:
                    text = getattr(input_tx, "text", "")
                    if text and self.on_transcript:
                        await self.on_transcript(text, "user", True)

                # --- Output transcription (final text of what the model said) ---
                output_tx = getattr(server_content, "output_transcription", None)
                if output_tx:
                    text = getattr(output_tx, "text", "")
                    if text and self.on_transcript:
                        await self.on_transcript(text, "assistant", True)

                # --- Turn complete ---
                if turn_complete:
                    if self.on_turn_ended:
                        await self.on_turn_ended("END_TURN")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            if not self.is_closing:
                logger.error(f"Gemini Live receive error: {e}")
                if self.on_error:
                    await self.on_error(f"Gemini Live stream error: {e}")

    async def send_audio_chunk(self, base64_audio: str):
        """Send a PCM audio chunk to Gemini Live."""
        if not self.is_connected or self.is_closing or not self._live_session:
            return
        try:
            raw_bytes = base64.b64decode(base64_audio)
            await self._live_session.send_realtime_input(
                audio=types.Blob(data=raw_bytes, mime_type="audio/pcm;rate=16000")
            )
        except Exception as e:
            logger.error(f"Error sending audio to Gemini Live: {e}")

    async def renew_connection(self):
        """Gemini Live manages its own connection; no-op."""
        logger.debug("renew_connection called on Gemini provider (no-op)")

    async def stop(self):
        """Close the Gemini Live session."""
        self.is_closing = True
        self.is_connected = False

        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()

        if self._live_session:
            try:
                await self._live_session.close()
            except Exception:
                pass
            self._live_session = None

        logger.info(f"Gemini Live session stopped: {self.session_id}")


class GeminiVoiceEngine:
    """
    Engine that manages GeminiVoiceSession instances.
    Same interface as NovaSonicVoiceEngine.
    """

    def __init__(self):
        self._active_sessions: Dict[str, GeminiVoiceSession] = {}
        self.model = GEMINI_VOICE_MODEL
        self.voice_id = GEMINI_VOICE_NAME

    def is_configured(self) -> bool:
        key = os.getenv("GEMINI_VOICE_API_KEY", GEMINI_VOICE_API_KEY)
        return bool(key and not key.startswith("your_"))

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "status": "ready" if configured else "credentials_needed",
            "provider": "gemini_live",
            "model_id": self.model,
            "voice_id": self.voice_id,
            "region": "global",
            "active_streams": len(self._active_sessions),
            "transport": "websocket",
            "turn_detection": "native",
            "connection_limit": "none"
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
    ) -> GeminiVoiceSession:
        if session_id in self._active_sessions:
            await self._active_sessions[session_id].stop()

        session = GeminiVoiceSession(
            session_id=session_id,
            system_prompt=system_prompt,
            voice_name=voice_id or self.voice_id,
            model=self.model,
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

    def get_session(self, session_id: str) -> Optional[GeminiVoiceSession]:
        return self._active_sessions.get(session_id)

    async def close_session(self, session_id: str):
        session = self._active_sessions.pop(session_id, None)
        if session:
            await session.stop()


_gemini_engine: Optional[GeminiVoiceEngine] = None


def get_gemini_voice_engine() -> GeminiVoiceEngine:
    global _gemini_engine
    if _gemini_engine is None:
        _gemini_engine = GeminiVoiceEngine()
    return _gemini_engine
