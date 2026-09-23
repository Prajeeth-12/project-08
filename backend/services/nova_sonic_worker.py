"""
Dedicated standalone worker for Amazon Nova 2 Sonic bidirectional streaming.
Runs under Python 3.13 using aws-sdk-bedrock-runtime and AWSCRTHTTPClient.
Communicates with the primary FastAPI application via standard I/O JSON lines.

Authored strictly from our team's engineering perspective for Project 08.
"""
import os
import sys
import json
import uuid
import time
import base64
import asyncio
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
load_dotenv()

# Check and import required Smithy and Bedrock SDK components
try:
    from aws_sdk_bedrock_runtime.client import AsyncBedrockRuntimeClient
    from aws_sdk_bedrock_runtime.config import AsyncBedrockRuntimeConfig
    from aws_sdk_bedrock_runtime.models import (
        InvokeModelWithBidirectionalStreamOperationInput,
        InvokeModelWithBidirectionalStreamInputChunk,
        BidirectionalInputPayloadPart,
    )
    from smithy_http.aio.crt import AWSCRTHTTPClient
    BEDROCK_AVAILABLE = True
except Exception as e:
    BEDROCK_AVAILABLE = False
    IMPORT_ERROR = str(e)


def emit(payload: Dict[str, Any]) -> None:
    """Emit a JSON message line to stdout for the parent FastAPI process."""
    try:
        sys.stdout.write(json.dumps(payload) + "\n")
        sys.stdout.flush()
    except Exception:
        pass


import math
import struct

class NovaSonicWorker:
    """
    Manages the lifecycle of an active Amazon Nova 2 Sonic bidirectional stream,
    including session initialization, audio streaming, event dispatch, 8-minute renewal,
    and automatic resilient local fallback when AWS credentials are unconfigured or invalid.
    """

    def __init__(self):
        self.client: Optional[AsyncBedrockRuntimeClient] = None
        self.stream = None
        self.session_id: str = ""
        self.model_id: str = "amazon.nova-2-sonic-v1:0"
        self.voice_id: str = "arjun"
        self.region: str = "us-east-1"
        self.system_prompt: str = ""
        self.prompt_name: str = ""
        self.user_audio_content_name: str = ""
        self.is_active: bool = False
        self.is_simulated: bool = False
        self.is_assistant_speaking: bool = False
        self._sim_turn_task: Optional[asyncio.Task] = None
        self._sim_speaking_task: Optional[asyncio.Task] = None
        self._turn_index: int = 0
        self._audio_chunks_received: int = 0
        self._last_audio_time: float = 0.0
        self.stream_start_time: float = 0.0
        self.listen_task: Optional[asyncio.Task] = None
        self.conversation_turns: List[Dict[str, str]] = []
        self.renewal_in_progress: bool = False

    async def initialize_client(self, region: str, access_key: str, secret_key: str):
        """Initialize the asynchronous Bedrock client with CRT transport."""
        if not access_key or access_key.startswith("your_") or not secret_key or secret_key.startswith("your_"):
            self.client = None
            return

        config = await AsyncBedrockRuntimeConfig.resolve(
            region=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            transport=AWSCRTHTTPClient()
        )
        self.client = AsyncBedrockRuntimeClient(config=config)

    async def _send_event_to_stream(self, event_dict: Dict[str, Any]):
        """Send a JSON event into the active Bedrock bidirectional input stream."""
        if not self.stream:
            return
        json_bytes = json.dumps(event_dict).encode("utf-8")
        chunk = InvokeModelWithBidirectionalStreamInputChunk(
            value=BidirectionalInputPayloadPart(bytes_=json_bytes)
        )
        await self.stream.input_stream.send(chunk)

    async def start_stream(self, is_renewal: bool = False):
        """Establish the bidirectional stream with Amazon Bedrock Nova Sonic or activate resilient fallback."""
        self.prompt_name = str(uuid.uuid4())
        self.user_audio_content_name = str(uuid.uuid4())

        if not self.client:
            # No live AWS credentials supplied; enter resilient local simulation
            emit({"type": "info", "message": f"AWS credentials not configured. Starting Nova Sonic local emulation mode."})
            self._enter_simulated_mode(is_renewal)
            return

        emit({"type": "info", "message": f"Opening Nova Sonic stream for model {self.model_id}..."})

        try:
            # Initiate the bidirectional stream
            new_stream = await self.client.invoke_model_with_bidirectional_stream(
                InvokeModelWithBidirectionalStreamOperationInput(model_id=self.model_id)
            )
            self.stream = new_stream
            self.stream_start_time = time.time()
            self.is_active = True
            self.is_simulated = False
        except Exception as e:
            emit({"type": "info", "message": f"Bedrock connection notice ({str(e)}). Activating resilient Nova Sonic local emulation mode."})
            self._enter_simulated_mode(is_renewal)
            return

        # 1. Send sessionStart
        await self._send_event_to_stream({
            "event": {
                "sessionStart": {
                    "inferenceConfiguration": {
                        "maxTokens": 1024,
                        "topP": 0.9,
                        "temperature": 0.7
                    }
                }
            }
        })

        # 2. Send promptStart (configure audio output parameters)
        # Supported voices include: matthew, tiffany, amy, etc. Fallback to matthew if custom voice not matched
        voice = self.voice_id.lower() if self.voice_id else "matthew"
        if voice not in ["matthew", "tiffany", "amy", "florian", "ambre", "beatrice", "lorenzo", "greta", "lupe", "carlos"]:
            voice = "matthew"

        await self._send_event_to_stream({
            "event": {
                "promptStart": {
                    "promptName": self.prompt_name,
                    "textOutputConfiguration": {
                        "mediaType": "text/plain"
                    },
                    "audioOutputConfiguration": {
                        "mediaType": "audio/lpcm",
                        "sampleRateHertz": 24000,
                        "sampleSizeBits": 16,
                        "channelCount": 1,
                        "voiceId": voice,
                        "encoding": "base64",
                        "audioType": "SPEECH"
                    },
                    "toolUseOutputConfiguration": {
                        "mediaType": "application/json"
                    },
                    "toolConfiguration": {
                        "tools": []
                    }
                }
            }
        })

        # 3. Inject system prompt and conversation context if available
        combined_system = self.system_prompt
        if is_renewal and self.conversation_turns:
            history_summary = "\n".join([f"{t['role']}: {t['text']}" for t in self.conversation_turns[-6:]])
            combined_system += f"\n\n[RESUMED SESSION CONTEXT]\nPrevious turns:\n{history_summary}\nPlease continue naturally from here."

        if combined_system:
            sys_content_name = str(uuid.uuid4())
            await self._send_event_to_stream({
                "event": {
                    "contentStart": {
                        "promptName": self.prompt_name,
                        "contentName": sys_content_name,
                        "type": "TEXT",
                        "role": "SYSTEM",
                        "interactive": False,
                        "textInputConfiguration": {
                            "mediaType": "text/plain"
                        }
                    }
                }
            })
            await self._send_event_to_stream({
                "event": {
                    "textInput": {
                        "promptName": self.prompt_name,
                        "contentName": sys_content_name,
                        "content": combined_system
                    }
                }
            })
            await self._send_event_to_stream({
                "event": {
                    "contentEnd": {
                        "promptName": self.prompt_name,
                        "contentName": sys_content_name
                    }
                }
            })

        # 4. Initialize user audio input block
        await self._send_event_to_stream({
            "event": {
                "contentStart": {
                    "promptName": self.prompt_name,
                    "contentName": self.user_audio_content_name,
                    "type": "AUDIO",
                    "role": "USER",
                    "interactive": True,
                    "audioInputConfiguration": {
                        "mediaType": "audio/lpcm",
                        "sampleRateHertz": 16000,
                        "sampleSizeBits": 16,
                        "channelCount": 1,
                        "audioType": "SPEECH",
                        "encoding": "base64"
                    }
                }
            }
        })

        # Cancel previous listener if any
        if self.listen_task and not self.listen_task.done():
            self.listen_task.cancel()

        # Launch listener task
        self.listen_task = asyncio.create_task(self._listen_to_bedrock_stream())
        emit({"type": "ready", "session_id": self.session_id, "is_renewal": is_renewal})

    async def _listen_to_bedrock_stream(self):
        """Asynchronously receive and dispatch output events from Bedrock Nova Sonic."""
        try:
            current_assistant_text = ""
            current_user_text = ""

            async for event in self.stream.output_stream:
                if not self.is_active:
                    break

                raw_bytes = getattr(getattr(event, "value", None), "bytes_", None)
                if not raw_bytes:
                    continue

                try:
                    payload = json.loads(raw_bytes.decode("utf-8"))
                except Exception:
                    continue

                inner_event = payload.get("event", {})

                # 1. Audio Output chunk from Nova Sonic (24kHz 16-bit PCM base64)
                if "audioOutput" in inner_event:
                    audio_b64 = inner_event["audioOutput"].get("content", "")
                    if audio_b64:
                        emit({"type": "audio", "data": audio_b64})

                # 2. Text Output chunk (transcription or assistant response)
                elif "textOutput" in inner_event:
                    text_chunk = inner_event["textOutput"].get("content", "")
                    role = inner_event["textOutput"].get("role", "ASSISTANT").lower()
                    if text_chunk:
                        if role == "user":
                            current_user_text += text_chunk
                            emit({"type": "transcript", "text": text_chunk, "role": "user", "is_final": False})
                        else:
                            current_assistant_text += text_chunk
                            emit({"type": "transcript", "text": text_chunk, "role": "assistant", "is_final": False})

                # 3. Content End (turn completion or interruption)
                elif "contentEnd" in inner_event:
                    stop_reason = inner_event["contentEnd"].get("stopReason", "END_TURN")
                    
                    if stop_reason == "INTERRUPTED":
                        # Barge-in detected! User spoke while assistant was generating audio
                        emit({"type": "barge_in", "stop_reason": stop_reason})
                    else:
                        emit({"type": "turn_ended", "stop_reason": stop_reason})

                    # Record turns for context renewal
                    if current_user_text:
                        self.conversation_turns.append({"role": "user", "text": current_user_text.strip()})
                        emit({"type": "transcript", "text": current_user_text.strip(), "role": "user", "is_final": True})
                        current_user_text = ""

                    if current_assistant_text:
                        self.conversation_turns.append({"role": "assistant", "text": current_assistant_text.strip()})
                        emit({"type": "transcript", "text": current_assistant_text.strip(), "role": "assistant", "is_final": True})
                        current_assistant_text = ""

        except asyncio.CancelledError:
            pass
        except Exception as e:
            emit({"type": "error", "message": f"Error in Nova Sonic output stream: {str(e)}"})

    def _enter_simulated_mode(self, is_renewal: bool = False):
        """Initialize PROTOCOL TEST MODE when live Bedrock credentials are unavailable.

        WARNING: This mode generates synthetic tones (NOT real speech) and
        hardcoded transcripts. Microphone input is NOT transcribed.
        Use ONLY for testing the WebSocket protocol and frontend UI states.
        """
        self.is_simulated = True
        self.is_active = True
        self.stream_start_time = time.time()
        emit({"type": "warning", "message": "PROTOCOL TEST MODE: AWS credentials missing or invalid. Audio is synthetic tones, transcripts are hardcoded. This is NOT a real interview."})
        emit({"type": "ready", "session_id": self.session_id, "is_renewal": is_renewal, "simulated": True})
        if not is_renewal and self._turn_index == 0:
            asyncio.create_task(self._send_simulated_greeting())

    def _generate_pcm_chunk(self, freq: float = 260.0, duration: float = 0.2, sample_rate: int = 24000) -> str:
        """Synthesize a base64-encoded 24kHz 16-bit linear PCM audio chunk."""
        num_samples = int(sample_rate * duration)
        raw_bytes = bytearray()
        for i in range(num_samples):
            envelope = min(1.0, i / 300.0) * min(1.0, (num_samples - i) / 300.0)
            sample_val = (
                0.6 * math.sin(2 * math.pi * freq * (i / sample_rate)) +
                0.3 * math.sin(2 * math.pi * (freq * 1.5) * (i / sample_rate)) +
                0.1 * math.sin(2 * math.pi * (freq * 2.0) * (i / sample_rate))
            )
            scaled = int(sample_val * envelope * 8000)
            raw_bytes.extend(struct.pack("<h", max(-32768, min(32767, scaled))))
        return base64.b64encode(raw_bytes).decode("ascii")

    async def _send_simulated_speech(self, text: str, freqs: List[float] = [240.0, 270.0, 290.0, 260.0]):
        """Stream simulated assistant response text and matching 24kHz audio chunks."""
        self.is_assistant_speaking = True
        words = text.split(" ")
        
        # Stream text words with natural speech cadence
        for idx, word in enumerate(words):
            if not self.is_assistant_speaking or not self.is_active:
                break
            emit({"type": "transcript", "text": word + " ", "role": "assistant", "is_final": False})
            
            # Emit an audio chunk every 3 words to simulate voice streaming
            if idx % 3 == 0:
                tone = freqs[(idx // 3) % len(freqs)]
                pcm_b64 = self._generate_pcm_chunk(freq=tone, duration=0.22)
                emit({"type": "audio", "data": pcm_b64})
            
            await asyncio.sleep(0.09)

        if self.is_assistant_speaking:
            self.conversation_turns.append({"role": "assistant", "text": text})
            emit({"type": "transcript", "text": text, "role": "assistant", "is_final": True})
            emit({"type": "turn_ended", "stop_reason": "END_TURN"})
        self.is_assistant_speaking = False

    async def _send_simulated_greeting(self):
        """Deliver initial interviewer greeting in simulated mode."""
        await asyncio.sleep(0.5)
        greeting = (
            "Hello! I am your technical interviewer today. I have your resume and the role specifications loaded. "
            "When you are ready, please introduce yourself and tell me about your recent engineering work."
        )
        await self._send_simulated_speech(greeting, [220.0, 250.0, 280.0, 240.0])

    async def _handle_simulated_turn_completion(self):
        """Process candidate turn after silence detection and generate contextual follow-up."""
        try:
            await asyncio.sleep(1.2)  # Wait for natural candidate speech pause
            if not self.is_active or self.is_assistant_speaking:
                return

            self._turn_index += 1
            
            # Candidate responses based on turn index
            candidate_texts = [
                "I have been building full-stack distributed systems with FastAPI and React, focusing on microservices, real-time WebSockets, and database optimizations.",
                "To handle high traffic, we implement Redis for distributed caching, horizontal scaling via Kubernetes, and token-bucket rate limiting at our API gateway.",
                "For data consistency, we use optimistic concurrency control in PostgreSQL, with event-driven message queues in RabbitMQ for asynchronous reconciliation."
            ]
            cand_text = candidate_texts[(self._turn_index - 1) % len(candidate_texts)]
            self.conversation_turns.append({"role": "user", "text": cand_text})
            emit({"type": "transcript", "text": cand_text, "role": "user", "is_final": True})

            # Interviewer follow-up questions
            interviewer_questions = [
                "That's a strong background. In your distributed architecture, how do you handle cache invalidation and ensure eventual consistency when data mutations occur?",
                "Excellent. When scaling to peak loads, what telemetry metrics do you monitor, and how do you handle cascading failures across interdependent microservices?",
                "Great analysis. Let's touch on database reliability: how do you prevent write-contention and handle schema migrations in high-availability production clusters?"
            ]
            reply_text = interviewer_questions[(self._turn_index - 1) % len(interviewer_questions)]
            await self._send_simulated_speech(reply_text, [260.0, 290.0, 310.0, 270.0])

        except asyncio.CancelledError:
            pass

    async def send_audio_chunk(self, b64_audio: str):
        """Stream an incoming 16kHz PCM audio chunk from the client into Bedrock or simulation."""
        if not self.is_active:
            return

        if self.is_simulated:
            self._audio_chunks_received += 1
            self._last_audio_time = time.time()

            # Barge-in: candidate spoke while simulated assistant was speaking
            if self.is_assistant_speaking:
                self.is_assistant_speaking = False
                emit({"type": "barge_in", "stop_reason": "INTERRUPTED"})

            # Restart candidate pause timer
            if self._sim_turn_task and not self._sim_turn_task.done():
                self._sim_turn_task.cancel()
            self._sim_turn_task = asyncio.create_task(self._handle_simulated_turn_completion())
            return

        if not self.stream:
            return

        # Check for 8-minute connection renewal threshold (450 seconds = 7.5 mins)
        now = time.time()
        if (now - self.stream_start_time) > 450 and not self.renewal_in_progress:
            asyncio.create_task(self.renew_session())

        await self._send_event_to_stream({
            "event": {
                "audioInput": {
                    "promptName": self.prompt_name,
                    "contentName": self.user_audio_content_name,
                    "content": b64_audio
                }
            }
        })

    async def renew_session(self):
        """Seamlessly renew the 8-minute Bedrock connection with conversation preservation."""
        if self.renewal_in_progress:
            return
        self.renewal_in_progress = True
        emit({"type": "info", "message": "Renewing Nova Sonic connection before 8-minute limit..."})

        try:
            # Conclude current audio content block
            await self._send_event_to_stream({
                "event": {
                    "contentEnd": {
                        "promptName": self.prompt_name,
                        "contentName": self.user_audio_content_name
                    }
                }
            })
            await self._send_event_to_stream({
                "event": {
                    "promptEnd": {
                        "promptName": self.prompt_name
                    }
                }
            })
            await self._send_event_to_stream({
                "event": {
                    "sessionEnd": {}
                }
            })
        except Exception:
            pass

        try:
            if self.stream:
                await self.stream.close()
        except Exception:
            pass

        # Reopen fresh stream with conversation history
        try:
            await self.start_stream(is_renewal=True)
            emit({"type": "renewed", "message": "Nova Sonic connection renewed successfully."})
        except Exception as e:
            emit({"type": "error", "message": f"Failed to renew Nova Sonic connection: {str(e)}"})
        finally:
            self.renewal_in_progress = False

    async def stop(self):
        """Gracefully close the stream and clean up resources."""
        self.is_active = False
        self.is_assistant_speaking = False
        if self._sim_turn_task and not self._sim_turn_task.done():
            self._sim_turn_task.cancel()
        try:
            if self.stream:
                await self._send_event_to_stream({
                    "event": {
                        "sessionEnd": {}
                    }
                })
                await self.stream.close()
        except Exception:
            pass

        if self.listen_task and not self.listen_task.done():
            self.listen_task.cancel()


async def main():
    """Main loop reading JSON line commands from stdin and processing them."""
    if not BEDROCK_AVAILABLE:
        emit({
            "type": "fatal",
            "message": f"Bedrock SDK dependencies unavailable: {IMPORT_ERROR}"
        })
        return

    worker = NovaSonicWorker()

    while True:
        try:
            line_str = await asyncio.to_thread(sys.stdin.readline)
            if not line_str:
                break

            line_str = line_str.strip()
            if not line_str:
                continue

            try:
                msg = json.loads(line_str)
            except json.JSONDecodeError:
                continue

            action = msg.get("action")

            if action == "init":
                worker.session_id = msg.get("session_id", str(uuid.uuid4()))
                worker.model_id = msg.get("model_id", "amazon.nova-2-sonic-v1:0")
                worker.voice_id = msg.get("voice_id", "matthew")
                worker.region = msg.get("region", "us-east-1")
                worker.system_prompt = msg.get("system_prompt", "")

                access_key = msg.get("aws_access_key_id") or os.getenv("AWS_ACCESS_KEY_ID", "")
                secret_key = msg.get("aws_secret_access_key") or os.getenv("AWS_SECRET_ACCESS_KEY", "")

                try:
                    await worker.initialize_client(worker.region, access_key, secret_key)
                    await worker.start_stream()
                except Exception as e:
                    emit({"type": "error", "message": f"Failed to initialize Nova Sonic: {str(e)}", "code": "INIT_FAILED"})

            elif action == "audio":
                audio_data = msg.get("data", "")
                if audio_data:
                    await worker.send_audio_chunk(audio_data)

            elif action == "renew":
                await worker.renew_session()

            elif action == "stop":
                await worker.stop()
                break

        except Exception as e:
            emit({"type": "error", "message": f"Worker loop error: {str(e)}"})

    await worker.stop()


if __name__ == "__main__":
    asyncio.run(main())
