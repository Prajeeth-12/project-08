# Project 08: Real-Time AI Mock Interview Platform
## Technical Architecture, Voice Engine Deep Dive & Diagnostic Report

**Author & Lead Architect:** Prajeeth  
**System:** Project 08 AI Mock Interview & Evaluation Platform  
**Tech Stack:** Next.js 14 / Vite React + Tailwind CSS + Monaco Editor | Python 3.11 + FastAPI (Async REST + WebSockets) | Google Gemini Live API & Amazon Nova 2 Sonic | Groq / OpenAI LLM | PostgreSQL + SQLAlchemy  

---

## 1. Executive System Architecture Overview

I designed **Project 08** as a high-performance, two-track technical assessment platform:
1. **Track 1 (Conversational Real-Time AI Track):** A low-latency, full-duplex voice interview engine capable of real-time conversational speech-to-speech, candidate resume grounding, dynamic probing (*Observe $\to$ Reason $\to$ Decide $\to$ Act* loop), interactive whiteboard/coding problem injection, and automated post-interview scoring.
2. **Track 2 (Formal Coding Assessment Track):** Standalone scheduled exams in an isolated Safe Exam Browser (SEB) environment with Judge0 containerized sandbox code execution.

```
+----------------------------------------------------------------------------------------------------+
|                                    PROJECT 08 ARCHITECTURE                                         |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|   +--------------------------------------------------------------------------------------------+   |
|   |                            CLIENT LAYER (React / Vite / Web Audio)                         |   |
|   |                                                                                            |   |
|   |   +-------------------------------+               +------------------------------------+   |   |
|   |   |   StreamingSpeechRecognition   |               |        StreamingAudioPlayer        |   |   |
|   |   |   (getUserMedia -> 16kHz PCM)  |               |    (24kHz PCM FIFO Source Queue)   |   |   |
|   |   +---------------+---------------+               +-----------------+------------------+   |   |
|   +-------------------|-------------------------------------------------|----------------------+   |
|                       |                                                 |                          |
|                       | Binary Int16Array PCM (16kHz)                   | Base64 PCM Chunks (24kHz)|
|                       v                                                 ^                          |
|   +---------------------------------------------------------------------|----------------------+   |
|   |                          BACKEND TRANSPORT (FastAPI / WebSockets)   |                      |   |
|   |                                                                     |                      |   |
|   |                     ws://localhost:8000/api/speech-to-text/stream   |                      |   |
|   |                                         |                           |                      |   |
|   |   +-------------------------------------v---------------------------+------------------+   |   |
|   |   |                 FastAPI Speech API Router (_handle_nova_sonic_stream)              |   |   |
|   |   +-------------------------------------+----------------------------------------------+   |   |
|   +-----------------------------------------|--------------------------------------------------+   |
|                                             |                                                      |
|                                             v                                                      |
|   +--------------------------------------------------------------------------------------------+   |
|   |                        CORE VOICE ENGINE & AGENT ORCHESTRATION                             |   |
|   |                                                                                            |   |
|   |   +------------------------------------------------------------------------------------+   |   |
|   |   |                  Voice Provider Interface (GeminiVoiceEngine / NovaSonic)          |   |   |
|   |   |     - Bidirectional WebSocket session (client.aio.live.connect)                    |   |   |
|   |   |     - Full-duplex audio stream, input/output transcriptions, barge-in detection     |   |   |
|   |   +------------------------------------------------------------------------------------+   |   |
|   |                                         ^                                                  |   |
|   |                                         | Dynamic Prompts & Session Context                |   |
|   |   +-------------------------------------v----------------------------------------------+   |   |
|   |   |                  AgentSessionManager & Stateful Multi-Agent Loop                   |   |   |
|   |   |     - InterviewerAgent: Persona state, dynamic questioning, syllabus progression   |   |   |
|   |   |     - AgenticCoachAgent: Per-turn rubric evaluation, real-time hints, Serper tool  |   |   |
|   |   +------------------------------------------------------------------------------------+   |   |
|   +--------------------------------------------------------------------------------------------+   |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. End-to-End Voice Pipeline & Data Flow

### Step 1: Client-Side Audio Capture & Digital Signal Processing (DSP)
1. **Microphone Acquisition:** The browser requests a media stream via `navigator.mediaDevices.getUserMedia()` with hardware acoustic controls:
   ```typescript
   {
     echoCancellation: true,
     noiseSuppression: true,
     autoGainControl: true
   }
   ```
2. **Web Audio Graph Routing:**
   - I instantiate an `AudioContext` and link the microphone `MediaStreamSourceNode` to a `ScriptProcessorNode` (buffer size: 2048 or 4096 samples).
   - To force the browser audio processing loop to fire continuously without looping the user's voice back into their own speakers, I route the processor through a `GainNode` with `gain.value = 0` to `audioContext.destination`:
     $$\text{Microphone Source} \longrightarrow \text{ScriptProcessorNode} \longrightarrow \text{Silent Gain (0.0)} \longrightarrow \text{AudioDestination}$$
3. **Linear Resampling to 16kHz 16-Bit Linear PCM:**
   - Browsers capture audio at hardware rates (typically $44.1\text{ kHz}$ or $48\text{ kHz}$).
   - Google Gemini Live and Amazon Nova 2 Sonic strictly require **$16\text{ kHz}$, 16-bit Little-Endian Linear PCM**.
   - I implemented an in-memory linear interpolation downsampler:
     $$\text{ratio} = \frac{\text{nativeSampleRate}}{16000}$$
     $$S_{\text{interpolated}} = S[k] + \text{frac} \cdot (S[k+1] - S[k])$$
     $$\text{PCM16}[i] = \text{clamp}(S_{\text{interpolated}}, -1.0, 1.0) \times 32767$$
4. **WebSocket Transmission:**
   - The resulting `Int16Array.buffer` is transmitted as raw binary frames over a persistent WebSocket (`ws://localhost:8000/api/speech-to-text/stream`).

---

### Step 2: Backend Transport & Voice Provider Routing
1. **ASGI WebSocket Ingestion:**
   - FastAPI accepts the WebSocket connection in `speech_api.py`.
   - The session manager binds the connection to the candidate's interview session (`session_id`).
   - A background async reader loop consumes binary PCM frames:
     ```python
     msg = await websocket.receive()
     if "bytes" in msg and msg["bytes"]:
         b64_pcm = base64.b64encode(msg["bytes"]).decode("ascii")
         await voice_session.send_audio_chunk(b64_pcm)
     ```
2. **Provider Dispatcher:**
   - Based on `.env` configuration (`VOICE_PROVIDER=gemini` or `VOICE_PROVIDER=nova`), the engine delegates the raw audio chunks to either `GeminiVoiceSession` or `NovaSonicVoiceSession`.

---

### Step 3: Google Gemini Live API Bidirectional Session
1. **Connection Initialization:**
   - Using the new `google-genai` SDK, I establish an asynchronous bidirectional Live session using `client.aio.live.connect()`:
     ```python
     config = types.LiveConnectConfig(
         response_modalities=["AUDIO"],
         system_instruction=types.Content(parts=[types.Part(text=system_prompt)]),
         speech_config=types.SpeechConfig(
             voice_config=types.VoiceConfig(
                 prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
             )
         ),
         input_audio_transcription=types.AudioTranscriptionConfig(),
         output_audio_transcription=types.AudioTranscriptionConfig(),
     )
     ```
2. **Full-Duplex Ingestion & Emission:**
   - **User Input:** Sent via `send_realtime_input(audio=types.Blob(data=raw_pcm, mime_type="audio/pcm;rate=16000"))`.
   - **Assistant Audio Output:** Received in `_receive_loop` from `msg.server_content.model_turn.parts`. The inline raw audio is base64-encoded and dispatched to the client over WebSocket as `{"type": "audio", "data": b64_pcm}`.
   - **Real-Time Transcriptions:**
     - `input_transcription` $\to$ Dispatches `{"type": "transcript", "role": "user", "text": "...", "is_final": true}`.
     - `output_transcription` $\to$ Dispatches `{"type": "transcript", "role": "assistant", "text": "...", "is_final": true}`.
   - **Barge-in / Interruption:** If the candidate speaks while the AI is outputting audio, Gemini Live's built-in Voice Activity Detection (VAD) fires `server_content.interrupted = True`, emitting a `{"type": "barge_in"}` event to immediately truncate client speaker playback.

---

### Step 4: Client Audio Playback Queue (`StreamingAudioPlayer`)
1. **Audio Decoding & 24kHz Sample Mapping:**
   - The AI voice output is formatted as **$24\text{ kHz}$ 16-bit mono PCM**.
   - `StreamingAudioPlayer` converts the incoming Base64 string into `Float32Array` values $[-1.0, 1.0]$.
   - It builds an `AudioBuffer` at $24\text{ kHz}$ using `audioContext.createBuffer(1, length, 24000)`.
2. **Gapless FIFO Scheduling:**
   - Using Web Audio's high-precision hardware clock (`audioContext.currentTime`), chunks are scheduled sequentially:
     $$\text{startTime} = \max(\text{audioContext.currentTime}, \text{nextPlayTime})$$
     $$\text{nextPlayTime} = \text{startTime} + \text{buffer.duration}$$
3. **Instant Interruption Cutoff:**
   - On barge-in or user turn, `StreamingAudioPlayer.stop()` calls `.stop()` and `.disconnect()` on all scheduled `AudioBufferSourceNode` references, cutting off audio with sub-millisecond latency.

---

## 3. Multi-Agent Reasoning Loop (`InterviewerAgent` + `AgenticCoachAgent`)

Our platform uses a multi-agent architectural separation of concerns:

```
                  +----------------------------------------------+
                  |               Candidate Speech               |
                  +----------------------+-----------------------+
                                         |
                         +---------------+---------------+
                         |                               |
                         v                               v
          +-------------------------------+   +-----------------------------+
          |       InterviewerAgent        |   |      AgenticCoachAgent      |
          |  (Dynamic Probing & Persona)  |   |  (Real-Time Per-Turn Coach) |
          +---------------+---------------+   +--------------+--------------+
                          |                                  |
                          | Conversational Response          | Rubric Scores, Hints,
                          | (Voice Stream)                   | Learning Search Tools
                          v                                  v
          +-------------------------------+   +-----------------------------+
          |      Candidate Earphones      |   |    Real-Time Coach Drawer   |
          +-------------------------------+   +-----------------------------+
```

1. **`InterviewerAgent`:**
   - Operates the conversational persona (e.g. Formal, Casual, FAANG Technical, or Stress Interview).
   - Tracks interview phases: `INTRODUCTION` $\to$ `EXPERIENCE_PROBE` $\to$ `CORE_TECHNICAL` $\to$ `PROBLEM_SOLVING` $\to$ `CLOSING`.
   - Grounds questions dynamically in candidate resume skills, past responses, and target job requirements.
2. **`AgenticCoachAgent` (Asynchronous Evaluator):**
   - Runs concurrently on Groq / OpenAI (`openai/gpt-oss-120b`).
   - Analyzes each exchange against 4 key assessment dimensions:
     - **Technical Accuracy & Depth**
     - **Communication Clarity & Conciseness**
     - **STAR Method Alignment (Situation, Task, Action, Result)**
     - **Confidence & Delivery**
   - Equipped with Serper web search tools to retrieve learning links for topics where the candidate showed knowledge gaps.

---

## 4. Current Technical Bottlenecks & Failure Modes

When defending or discussing the implementation with senior mentors, here are the technical bottlenecks we are actively addressing:

### Issue A: Browser Autoplay Policy & AudioContext Initialization Lifecycle
- **Symptom:** AI audio chunks are received over WebSocket, but no sound comes out of the device speakers.
- **Root Cause:**
  - Modern web browsers (Chromium / Safari / Firefox) enforce strict **Autoplay Policies**.
  - An `AudioContext` created or resumed from a WebSocket message callback (which is an asynchronous network event, not a synchronous user gesture) remains in a `'suspended'` state.
  - Furthermore, initializing `new AudioContext({ sampleRate: 24000 })` fails on specific Windows sound hardware drivers (Realtek/ASIO/USB DACs) that do not support arbitrary constructor sample rates.
- **Resolution:**
  - Create the `AudioContext` at the native hardware sample rate ($44.1\text{ kHz}$ or $48\text{ kHz}$) and let `createBuffer(1, length, 24000)` handle the 24kHz decode.
  - Explicitly bind an `unlock()` call directly to user gesture handlers (`click`, `touchstart`, modal dismiss).

---

### Issue B: Dual Hardware Stream Contention on Windows OS
- **Symptom:** Candidate speaks into the microphone, but RMS remains $0.000$ or frames carry silence.
- **Root Cause:**
  - `StreamingSpeechRecognition` called `navigator.mediaDevices.getUserMedia()` to acquire audio for 16kHz PCM streaming.
  - Simultaneously, the voice activity waveform visualizer called `navigator.mediaDevices.getUserMedia()` a second time on the same audio input hardware.
  - Under Windows Core Audio (WASAPI), requesting two concurrent exclusive capture handles on the same hardware input device can cause one stream to become muted (`muted=true`) or deliver zero-byte sample arrays.
- **Resolution:**
  - Re-use the single active `MediaStream` instance from `StreamingSpeechRecognition` across both the PCM downsampling processor and the WebGL waveform analyzer.

---

### Issue C: Gemini Live API Duplex Audio Gating & Turn Synchronization
- **Symptom:** Candidate speaks, but Gemini Live does not trigger an input transcription or generate a vocal reply.
- **Root Cause:**
  - The Gemini Live session expects continuous 16kHz Little-Endian Linear PCM chunks (`audio/pcm;rate=16000`).
  - If the client's acoustic gate (barge-in RMS threshold) suppresses frames when `isAiSpeaking` is set to `true`, and `isAiSpeaking` is not reset immediately when the AI finishes speaking, the client drops the candidate's opening words before they reach Gemini's server-side VAD.
  - In addition, Gemini Live requires `turn_complete` signals to synchronize when the assistant's turn is finished so the model is ready to process the candidate's response.
- **Resolution:**
  - Allow continuous streaming of microphone frames whenever `isMuted` is false, relying on Gemini Live's native server-side VAD and client browser acoustic echo cancellation (`echoCancellation: true`).
  - Explicitly reset `isAiSpeaking = false` and `turnState = 'user'` on `turn_ended` and `audioPlayer.onended`.

---

## 5. Architectural Checklist for Mentor Review

| Architectural Component | Target Design Standard | Current Status |
| :--- | :--- | :--- |
| **Microphone Downsampling** | Native $48\text{kHz} \to 16\text{kHz}$ 16-bit Linear PCM | Verified & Working |
| **WebSocket Transport** | Binary Int16 ArrayBuffer over persistent WS | Verified & Working |
| **Backend Provider Adapter** | Full-duplex `google-genai` Live session | Connected (`gemini-3.8-live`) |
| **Audio Playback Pipeline** | $24\text{kHz}$ PCM gapless FIFO queue | Fixed (Hardware native AudioContext + Unlock) |
| **Interruption / Barge-in** | Server VAD + client-side instantaneous source cutoff | Implemented (`onBargeIn` + `source.stop()`) |
| **Asynchronous Coach Engine** | Groq `openai/gpt-oss-120b` rubric scoring | Verified & Working |
