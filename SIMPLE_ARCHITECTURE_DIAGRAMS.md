# Project 08: AI Mock Interview & Evaluation Platform
# Visual Architecture & Flow Diagrams (High-Contrast Mentor Guide)

**Lead Architect:** Prajeeth  
**System:** Project 08 Enterprise Two-Track Assessment Platform  

---

## 1. High-Level End-to-End System Flow

```mermaid
flowchart LR
    A["👤 Candidate\n(Mic & Screen)"] -->|"1. Live Voice Speech"| B["🎧 Web Audio DSP\n(16kHz PCM Downsample)"]
    B -->|"2. WebSocket (WSS)\n(Binary Frame 0x02)"| C["⚡ FastAPI Backend\n(Async Starlette ASGI)"]
    C -->|"3. Orchestration"| D["🤖 Multi-Agent Engine\n(Interviewer + Coach)"]
    D -->|"4. Conversational Question"| E["🔊 Spoken Voice Engine\n(Speech Synthesis / Gemini)"]
    E -->|"5. Spoken Audio (24kHz)"| A

    subgraph Evaluation["📊 Asynchronous Background Evaluation"]
        D -.->|"Async Turn Payload"| F["🧠 Groq LLM (GPT-OSS-120B)\nSTAR Rubric & Serper Search"]
        F -.->|"Live Feedback Hints"| A
    end

    style A fill:#ffffff,stroke:#2563eb,stroke-width:2px,color:#0f172a
    style B fill:#ffffff,stroke:#0284c7,stroke-width:2px,color:#0f172a
    style C fill:#ffffff,stroke:#d97706,stroke-width:2px,color:#0f172a
    style D fill:#ffffff,stroke:#16a34a,stroke-width:2px,color:#0f172a
    style E fill:#ffffff,stroke:#9333ea,stroke-width:2px,color:#0f172a
    style F fill:#ffffff,stroke:#e11d48,stroke-width:2px,color:#0f172a
    style Evaluation fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,color:#0f172a
```

---

## 2. Decoupled Multi-Agent Core

I designed a decoupled dual-agent architecture so conversational voice turns experience zero latency penalty while deep rubric evaluations run concurrently in the background.

```mermaid
flowchart TD
    User["👤 Candidate Speaks Response"] --> Bridge["⚡ FastAPI Session Manager"]
    
    Bridge --> Agent1["🎯 InterviewerAgent (Front-line Voice)"]
    Bridge -.->|Async Background Task| Agent2["📊 AgenticCoachAgent (Evaluator)"]
    
    Agent1 -->|"1. Resume Grounded Probing\n2. Syllabus Phase Traversal\n3. Conversational Spoken Audio"| User
    
    Agent2 --> Score["1. Technical Accuracy (0-100)\n2. Communication Clarity (0-100)\n3. STAR Method Alignment (0-100)\n4. Confidence Delivery (0-100)"]
    Score --> Search["🔍 Serper Google Search API\n(Curates Live Documentation Links)"]
    Search --> CoachHUD["📱 Candidate Real-Time HUD Drawer"]

    style User fill:#ffffff,stroke:#334155,stroke-width:2px,color:#0f172a
    style Bridge fill:#ffffff,stroke:#d97706,stroke-width:2px,color:#0f172a
    style Agent1 fill:#ffffff,stroke:#2563eb,stroke-width:2px,color:#0f172a
    style Agent2 fill:#ffffff,stroke:#dc2626,stroke-width:2px,color:#0f172a
    style Score fill:#ffffff,stroke:#475569,stroke-width:2px,color:#0f172a
    style Search fill:#ffffff,stroke:#0891b2,stroke-width:2px,color:#0f172a
    style CoachHUD fill:#ffffff,stroke:#16a34a,stroke-width:2px,color:#0f172a
```

---

## 3. Real-Time Voice & Audio DSP Pipeline

```mermaid
flowchart TD
    subgraph ClientDSP["🎧 Client-Side DSP (Browser Web Audio)"]
        Mic["Microphone Input (44.1/48kHz Native)"] --> AEC["Acoustic Echo Cancellation (AEC)"]
        AEC --> Resample["Linear Resampling Engine\n(Downsample to 16kHz 16-bit PCM)"]
        Resample --> WS["WebSocket Binary Frame (Opcode 0x02)"]
    end

    subgraph BackendVoice["⚡ Backend Voice Ingestion (FastAPI)"]
        WS --> ASGI["FastAPI Endpoint: _handle_nova_sonic_stream"]
        ASGI --> VoiceSession["GeminiVoiceSession / Nova 2 Sonic"]
    end

    subgraph PlaybackDSP["🔊 Gapless Audio Output"]
        VoiceSession --> AudioChunk["24kHz PCM Audio Chunks"]
        AudioChunk --> Player["StreamingAudioPlayer / Native Speech Synthesis"]
        Player --> Speaker["Candidate Headphones / Speakers"]
    end

    subgraph BargeIn["🛑 Instant Barge-In Protection"]
        Mic -.->|"Candidate Speaks Over AI (RMS > 0.02)"| Cutoff["Instant Audio Source Cutoff (< 5ms)"]
        Cutoff -.-> Player
    end

    style ClientDSP fill:#f8fafc,stroke:#2563eb,stroke-width:2px,color:#0f172a
    style BackendVoice fill:#f8fafc,stroke:#d97706,stroke-width:2px,color:#0f172a
    style PlaybackDSP fill:#f8fafc,stroke:#16a34a,stroke-width:2px,color:#0f172a
    style BargeIn fill:#f8fafc,stroke:#dc2626,stroke-width:2px,color:#0f172a

    style Mic fill:#ffffff,stroke:#334155,color:#0f172a
    style AEC fill:#ffffff,stroke:#334155,color:#0f172a
    style Resample fill:#ffffff,stroke:#334155,color:#0f172a
    style WS fill:#ffffff,stroke:#334155,color:#0f172a
    style ASGI fill:#ffffff,stroke:#334155,color:#0f172a
    style VoiceSession fill:#ffffff,stroke:#334155,color:#0f172a
    style AudioChunk fill:#ffffff,stroke:#334155,color:#0f172a
    style Player fill:#ffffff,stroke:#334155,color:#0f172a
    style Speaker fill:#ffffff,stroke:#334155,color:#0f172a
    style Cutoff fill:#ffffff,stroke:#dc2626,color:#0f172a
```

---

## 4. Two-Track Assessment Architecture

```mermaid
flowchart TB
    Platform["🏢 Project 08 Platform Engine"]
    
    Platform --> Track1["🎙️ TRACK 1: Real-Time AI Interview"]
    Platform --> Track2["💻 TRACK 2: Formal Coding Assessment"]

    Track1 --> T1_Voice["Full-Duplex Conversational Voice Engine"]
    Track1 --> T1_Resume["Resume Intelligence & Dynamic Syllabus Probing"]
    Track1 --> T1_Whiteboard["In-Session Interactive Coding & Notepad Tool"]
    Track1 --> T1_Scorecard["Multi-Dimension Evaluation PDF Scorecard"]

    Track2 --> T2_SEB["Safe Exam Browser (SEB) OS Lockdown\n(Blocks Alt+Tab, VMs, Dual Monitors)"]
    Track2 --> T2_Editor["Monaco Code Editor & Custom Testcases"]
    Track2 --> T2_Sandbox["Judge0 CE Isolated Sandbox\n(2.0s CPU Limit, 128MB RAM, --net none)"]
    Track2 --> T2_Report["Campus Batch Placement Drive Leaderboard"]

    style Platform fill:#ffffff,stroke:#0f172a,stroke-width:2px,color:#0f172a
    style Track1 fill:#ffffff,stroke:#2563eb,stroke-width:2px,color:#0f172a
    style Track2 fill:#ffffff,stroke:#d97706,stroke-width:2px,color:#0f172a

    style T1_Voice fill:#ffffff,stroke:#3b82f6,color:#0f172a
    style T1_Resume fill:#ffffff,stroke:#3b82f6,color:#0f172a
    style T1_Whiteboard fill:#ffffff,stroke:#3b82f6,color:#0f172a
    style T1_Scorecard fill:#ffffff,stroke:#3b82f6,color:#0f172a

    style T2_SEB fill:#ffffff,stroke:#f59e0b,color:#0f172a
    style T2_Editor fill:#ffffff,stroke:#f59e0b,color:#0f172a
    style T2_Sandbox fill:#ffffff,stroke:#f59e0b,color:#0f172a
    style T2_Report fill:#ffffff,stroke:#f59e0b,color:#0f172a
```

---

## 5. Interview Session Finite State Machine (FSM)

```mermaid
stateDiagram-v2
    [*] --> CREATED: Candidate selects job role & duration
    CREATED --> OPENING: Clicks "Start Interview" (AudioContext Unlocked)
    OPENING --> EXPERIENCE_PROBE: AI greeting finishes -> Probing resume
    EXPERIENCE_PROBE --> CORE_TECHNICAL: Algorithmic & conceptual probing
    CORE_TECHNICAL --> PROBLEM_SOLVING: Technical whiteboard / live code problem
    PROBLEM_SOLVING --> CLOSING: Time remaining < 2 minutes
    CLOSING --> COMPLETED: 00:00 Timer expired or interview concluded
    COMPLETED --> POST_SCORECARD: Compiles multi-turn evaluation report
    POST_SCORECARD --> [*]
```

---

## 6. How to Explain This to Your Mentor in 60 Seconds

1. **Core Concept:** *"I architected Project 08 as a Two-Track platform. Track 1 is a full-duplex conversational AI interviewer with real-time voice and dynamic probing. Track 2 is a locked-down formal coding exam environment with Safe Exam Browser (SEB) and Judge0 sandbox execution."*
2. **Sub-800ms Latency:** *"To eliminate conversational lag, I bypassed traditional batch STT/TTS and built a duplex WebSocket pipeline streaming binary 16kHz PCM audio directly between the browser's Web Audio DSP engine and our backend agent broker."*
3. **Decoupled Multi-Agent:** *"I separated concerns between `InterviewerAgent` (which handles the live conversational persona and question flow) and `AgenticCoachAgent` (which asynchronously computes STAR rubric scores and queries the Serper Search API for learning materials without blocking audio turns)."*
4. **Reliability & Hardware Handling:** *"The client features linear interpolation downsampling, acoustic echo cancellation, zero-gain feedback routing, instantaneous barge-in cutoff, and hybrid speech synthesis."*
