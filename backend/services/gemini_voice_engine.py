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
from dotenv import load_dotenv

# Ensure environment variables are loaded
_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=_env_path) if os.path.exists(_env_path) else load_dotenv()

from google import genai
from google.genai import types

from backend.config import get_logger

logger = get_logger("GeminiVoiceEngine")


def _get_gemini_voice_api_key() -> str:
    return os.getenv("GEMINI_VOICE_API_KEY", "")


def _get_gemini_voice_model() -> str:
    return os.getenv("GEMINI_VOICE_MODEL", "gemini-3.8-live")


def _get_gemini_voice_name() -> str:
    return os.getenv("GEMINI_VOICE_NAME", "Aoede")


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
        self.voice_name = voice_name or _get_gemini_voice_name()
        self.model = model or _get_gemini_voice_model()
        self.api_key = api_key or _get_gemini_voice_api_key()

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
                response_modalities=["AUDIO"],
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

            self._ctx_manager = self._client.aio.live.connect(
                model=self.model,
                config=config
            )
            self._live_session = await self._ctx_manager.__aenter__()

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

        audio_chunk_count = 0
        try:
            async for msg in self._live_session.receive():
                if self.is_closing:
                    break

                server_content = getattr(msg, "server_content", None)
                if not server_content:
                    continue

                # --- Interruption (barge-in) ---
                if getattr(server_content, "interrupted", False):
                    logger.info("Gemini Live: interrupted (barge-in)")
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
                            audio_chunk_count += 1
                            if audio_chunk_count == 1:
                                logger.info("🔊 Gemini Live: first audio chunk received — streaming to browser")
                            audio_b64 = base64.b64encode(inline_data.data).decode("ascii")
                            if self.on_audio:
                                await self.on_audio(audio_b64)

                        # Streaming text (partial assistant response)
                        text = getattr(part, "text", None)
                        if text and self.on_transcript:
                            await self.on_transcript(text, "assistant", False)

                # --- Interim input transcription (streaming what the user is saying) ---
                interim_tx = getattr(server_content, "interim_input_transcription", None)
                if interim_tx:
                    text = getattr(interim_tx, "text", "") or ""
                    if not text and hasattr(interim_tx, "parts") and interim_tx.parts:
                        text = " ".join([getattr(p, "text", "") for p in interim_tx.parts if getattr(p, "text", None)])
                    if text and self.on_transcript:
                        await self.on_transcript(text, "user", False)

                # --- Final input transcription (what the user said) ---
                input_tx = getattr(server_content, "input_transcription", None)
                if input_tx:
                    text = getattr(input_tx, "text", "") or ""
                    if not text and hasattr(input_tx, "parts") and input_tx.parts:
                        text = " ".join([getattr(p, "text", "") for p in input_tx.parts if getattr(p, "text", None)])
                    if text and self.on_transcript:
                        logger.info(f"Candidate voice transcribed (final): '{text}'")
                        await self.on_transcript(text, "user", True)

                # --- Output transcription (final text of what the model said) ---
                output_tx = getattr(server_content, "output_transcription", None)
                if output_tx:
                    text = getattr(output_tx, "text", "") or ""
                    if not text and hasattr(output_tx, "parts") and output_tx.parts:
                        text = " ".join([getattr(p, "text", "") for p in output_tx.parts if getattr(p, "text", None)])
                    if text and self.on_transcript:
                        await self.on_transcript(text, "assistant", True)

                # --- Turn complete ---
                if turn_complete:
                    logger.info(f"🔄 Gemini Live: turn complete (sent {audio_chunk_count} audio chunks)")
                    audio_chunk_count = 0
                    if self.on_turn_ended:
                        await self.on_turn_ended("END_TURN")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            if not self.is_closing:
                logger.error(f"Gemini Live receive error: {e}")
                # Auto-reconnect on keepalive timeout or connection drop
                if "keepalive" in str(e).lower() or "ping" in str(e).lower() or "1011" in str(e):
                    logger.info("🔄 Gemini Live connection dropped — attempting reconnect...")
                    await self._reconnect()
                else:
                    if self.on_error:
                        await self.on_error(f"Gemini Live stream error: {e}")

    async def send_audio_chunk(self, base64_audio: str):
        """Send a PCM audio chunk to Gemini Live."""
        if not self.is_connected or self.is_closing or not self._live_session:
            return
        try:
            raw_bytes = base64.b64decode(base64_audio)
            self._audio_frames_sent = getattr(self, '_audio_frames_sent', 0) + 1
            if self._audio_frames_sent % 300 == 1:
                logger.info(f"🎤 Sending user audio to Gemini Live (frame #{self._audio_frames_sent}, {len(raw_bytes)} bytes)")
            await self._live_session.send_realtime_input(
                audio=types.Blob(data=raw_bytes, mime_type="audio/pcm;rate=16000")
            )
        except Exception as e:
            logger.error(f"Error sending audio to Gemini Live: {e}")

    async def send_realtime_text(self, text: str):
        """Send a text turn to Gemini Live and signal turn complete so it generates audio."""
        if not self.is_connected or self.is_closing or not self._live_session:
            return
        try:
            # Must use send_client_content with turn_complete=True for text —
            # send_realtime_input(text=...) is for streaming and never signals end-of-turn,
            # so Gemini waits indefinitely and never generates a response.
            await self._live_session.send_client_content(
                turns=types.Content(
                    role="user",
                    parts=[types.Part(text=text)]
                ),
                turn_complete=True
            )
            logger.info(f"Sent text turn to Gemini Live ({len(text)} chars)")
        except Exception as e:
            logger.error(f"Error sending text to Gemini Live: {e}")

    async def _reconnect(self):
        """Reconnect Gemini Live session after a connection drop."""
        if self.is_closing:
            return
        try:
            # Close old session cleanly
            if self._live_session:
                try:
                    if hasattr(self, '_ctx_manager') and self._ctx_manager:
                        await self._ctx_manager.__aexit__(None, None, None)
                except Exception:
                    pass
            self._live_session = None
            self._ctx_manager = None
            self.is_connected = False
            self._audio_frames_sent = 0

            # Brief pause before reconnect
            await asyncio.sleep(1.0)

            config = types.LiveConnectConfig(
                response_modalities=["AUDIO"],
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
            self._ctx_manager = self._client.aio.live.connect(model=self.model, config=config)
            self._live_session = await self._ctx_manager.__aenter__()
            self.is_connected = True
            self._receive_task = asyncio.create_task(self._receive_loop())
            logger.info(f"✅ Gemini Live reconnected: session={self.session_id}")
            if self.on_renewed:
                await self.on_renewed()
        except Exception as e:
            logger.exception(f"❌ Gemini Live reconnect failed: {e}")
            if self.on_error:
                await self.on_error(f"Voice reconnection failed: {e}")

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
                if hasattr(self, '_ctx_manager') and self._ctx_manager:
                    await self._ctx_manager.__aexit__(None, None, None)
                else:
                    await self._live_session.close()
            except Exception:
                pass
            self._live_session = None
            self._ctx_manager = None

        logger.info(f"Gemini Live session stopped: {self.session_id}")


class GeminiVoiceEngine:
    """
    Engine that manages GeminiVoiceSession instances.
    Same interface as NovaSonicVoiceEngine.
    """

    def __init__(self):
        self._active_sessions: Dict[str, GeminiVoiceSession] = {}

    @property
    def model(self) -> str:
        return _get_gemini_voice_model()

    @property
    def voice_id(self) -> str:
        return _get_gemini_voice_name()

    def is_configured(self) -> bool:
        key = _get_gemini_voice_api_key()
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
