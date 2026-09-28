"""
WebSocket Interview Session — V2.
Proper interview WS separate from the voice/STT WebSocket.
Manages interview state machine, streams structured events, supports reconnect.

Events (server → client):
  INTERVIEW_STARTED  {agenda, blueprint_summary}
  QUESTION           {turn_id, content, competency, section}
  FOLLOWUP           {turn_id, content}
  STATE_CHANGED      {new_state, section, competency}
  TOOL_INVOKED       {tool_type, context}      ← V3: when agent invokes coding
  AGENT_STATUS       {status: thinking|deciding}
  INTERVIEW_ENDED    {reason, summary}
  ERROR              {code, message}

Messages (client → server):
  CANDIDATE_RESPONSE {content, turn_id}
  PING               {}
  PAUSE_REQUEST      {}
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from starlette.websockets import WebSocketState

from backend.api.auth_api import _decode_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["interview-ws"])


async def _get_session_manager(session_id: str):
    try:
        from backend.services import get_session_registry
        registry = get_session_registry()
        return await registry.get_session_manager(session_id)
    except Exception:
        return None


async def _safe_send(ws: WebSocket, data: dict):
    try:
        if ws.client_state == WebSocketState.CONNECTED:
            await ws.send_json(data)
    except Exception:
        pass


@router.websocket("/ws/interview/{session_id}")
async def interview_ws(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None),
):
    """
    Bidirectional WebSocket for a live interview session.
    Streams interviewer questions and receives candidate answers.
    Supports reconnection — resumes from last persisted state.
    """
    await websocket.accept()

    # Authenticate
    user_id = None
    if token:
        try:
            payload = await _decode_token(token)
            user_id = payload.get("sub")
        except Exception:
            await _safe_send(websocket, {"type": "ERROR", "code": 401, "message": "Invalid token"})
            await websocket.close(code=4001)
            return

    session_manager = await _get_session_manager(session_id)
    if not session_manager:
        await _safe_send(websocket, {"type": "ERROR", "code": 404, "message": "Session not found"})
        await websocket.close(code=4004)
        return

    logger.info(f"WS interview connected: session={session_id}")

    # Send interview started event
    try:
        intro = session_manager.get_interviewer_introduction()
        await _safe_send(websocket, {
            "type": "INTERVIEW_STARTED",
            "session_id": session_id,
            "agenda": intro or "Welcome to your AI interview. I'll ask you a series of questions.",
        })

        # Send first question from the agent
        await _safe_send(websocket, {"type": "AGENT_STATUS", "status": "thinking"})
        first_response = await asyncio.to_thread(session_manager.process_message, "")
        if first_response:
            await _safe_send(websocket, {
                "type": "QUESTION",
                "turn_id": str(uuid.uuid4()),
                "content": first_response.get("content", ""),
                "question_type": first_response.get("response_type", "question"),
            })
    except Exception as e:
        logger.error(f"WS intro failed: {type(e).__name__}")

    # Main message loop
    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=300.0)
            except asyncio.TimeoutError:
                await _safe_send(websocket, {"type": "PING"})
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")

            if msg_type == "CANDIDATE_RESPONSE":
                content = msg.get("content", "").strip()
                if not content:
                    continue

                await _safe_send(websocket, {"type": "AGENT_STATUS", "status": "thinking"})

                try:
                    response = await asyncio.to_thread(session_manager.process_message, content)

                    if not response:
                        continue

                    resp_type = response.get("response_type", "question")
                    if resp_type == "closing":
                        await _safe_send(websocket, {
                            "type": "INTERVIEW_ENDED",
                            "reason": "agent_decision",
                            "content": response.get("content", ""),
                        })
                        break
                    else:
                        await _safe_send(websocket, {
                            "type": "QUESTION",
                            "turn_id": str(uuid.uuid4()),
                            "content": response.get("content", ""),
                            "question_type": resp_type,
                        })

                    # Check if interview should end
                    if session_manager.should_end_interview():
                        await _safe_send(websocket, {
                            "type": "INTERVIEW_ENDED",
                            "reason": "completion",
                        })
                        break

                except Exception as e:
                    logger.error(f"WS response processing error: {type(e).__name__}")
                    await _safe_send(websocket, {
                        "type": "ERROR",
                        "code": 500,
                        "message": "Failed to process your response. Please try again.",
                    })

            elif msg_type == "PING":
                await _safe_send(websocket, {"type": "PONG", "timestamp": datetime.utcnow().isoformat()})

            elif msg_type == "PAUSE_REQUEST":
                await _safe_send(websocket, {"type": "STATE_CHANGED", "new_state": "PAUSED"})

    except WebSocketDisconnect:
        logger.info(f"WS interview disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WS interview error: {type(e).__name__}")
    finally:
        logger.info(f"WS interview session ended: session={session_id}")
