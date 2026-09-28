import json
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.session import InterviewSession, SessionStage

router = APIRouter(prefix="/sessions", tags=["Live Interview Room & Session State (Member A3)"])

class ConnectionManager:
    """Manages active live WebSocket connections per interview room."""
    def __init__(self):
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_rooms:
            self.active_rooms[session_id] = []
        self.active_rooms[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_rooms:
            if websocket in self.active_rooms[session_id]:
                self.active_rooms[session_id].remove(websocket)
            if not self.active_rooms[session_id]:
                del self.active_rooms[session_id]

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_rooms:
            payload = json.dumps(message)
            for connection in self.active_rooms[session_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    pass

manager = ConnectionManager()

class StartSessionRequest(BaseModel):
    candidate_id: str
    role_title: Optional[str] = "Full Stack Software Engineer"

class UpdateStageRequest(BaseModel):
    stage: SessionStage

class PostMessageRequest(BaseModel):
    sender: str  # AI or CANDIDATE
    content: str

class SessionResponse(BaseModel):
    id: str
    candidate_id: str
    role_title: str
    stage: str
    transcript: list

@router.post("/start", response_model=SessionResponse)
async def start_session(req: StartSessionRequest, db: AsyncSession = Depends(get_db)):
    """Initialize a new live interview session room."""
    init_transcript = [
        {
            "sender": "AI",
            "content": f"Hello! Welcome to your interview for the {req.role_title} role. I've reviewed your resume and project claims. Let's begin by having you briefly introduce yourself and the project you're proudest of.",
        }
    ]
    session = InterviewSession(
        candidate_id=req.candidate_id,
        role_title=req.role_title,
        stage=SessionStage.TECH,
        transcript=json.dumps(init_transcript),
    )
    db.add(session)
    await db.flush()

    return SessionResponse(
        id=session.id,
        candidate_id=session.candidate_id,
        role_title=session.role_title,
        stage=session.stage.value,
        transcript=init_transcript,
    )

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch current interview room state and message history."""
    session = await db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(
        id=session.id,
        candidate_id=session.candidate_id,
        role_title=session.role_title,
        stage=session.stage.value,
        transcript=json.loads(session.transcript),
    )

@router.patch("/{session_id}/stage", response_model=SessionResponse)
async def update_session_stage(session_id: str, req: UpdateStageRequest, db: AsyncSession = Depends(get_db)):
    """Transition the room between assessment stages (TECH -> CODING_TOOL -> EVALUATING)."""
    session = await db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.stage = req.stage
    await db.flush()

    # Broadcast stage change to live UI
    await manager.broadcast(session_id, {"type": "STAGE_CHANGED", "stage": req.stage.value})

    return SessionResponse(
        id=session.id,
        candidate_id=session.candidate_id,
        role_title=session.role_title,
        stage=session.stage.value,
        transcript=json.loads(session.transcript),
    )

@router.post("/{session_id}/message", response_model=SessionResponse)
async def post_message(session_id: str, req: PostMessageRequest, db: AsyncSession = Depends(get_db)):
    """Append a message turn to the interview room transcript."""
    session = await db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript_list = json.loads(session.transcript)
    transcript_list.append({"sender": req.sender, "content": req.content})
    session.transcript = json.dumps(transcript_list)
    await db.flush()

    # Broadcast new message event
    await manager.broadcast(session_id, {"type": "NEW_MESSAGE", "sender": req.sender, "content": req.content})

    return SessionResponse(
        id=session.id,
        candidate_id=session.candidate_id,
        role_title=session.role_title,
        stage=session.stage.value,
        transcript=transcript_list,
    )

@router.websocket("/ws/{session_id}")
async def session_websocket(websocket: WebSocket, session_id: str):
    """Bi-directional WebSocket for real-time interview state & question streaming."""
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming ping / messages
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
