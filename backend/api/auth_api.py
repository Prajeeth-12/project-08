"""
Authentication API — AWS Cognito backend.

Same endpoint contract as before (frontend unchanged):
  POST /auth/register
  POST /auth/login
  POST /auth/refresh
  GET  /auth/me
  POST /auth/logout
  DELETE /auth/me/data   ← new: GDPR/DPDPA right to deletion

When COGNITO_USER_POOL_ID is set, uses Cognito.
Falls back to mock JWT for local development (USE_MOCK_AUTH=true).
"""

import os
import json
import logging
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

import boto3
import httpx
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import jwt
from jwt.algorithms import RSAAlgorithm

from backend.config import get_logger

logger = get_logger(__name__)

# ── Config ────────────────────────────────────────────────────────────────

COGNITO_REGION = os.getenv("COGNITO_REGION", os.getenv("AWS_REGION", "us-east-1"))
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID", "")
USE_MOCK_AUTH = os.getenv("USE_MOCK_AUTH", "false").lower() == "true"
_MOCK_SECRET = "dev-mock-secret-not-for-production"

_cognito = None
_jwks_cache: dict = {}

def _get_cognito():
    global _cognito
    if _cognito is None:
        _cognito = boto3.client("cognito-idp", region_name=COGNITO_REGION)
    return _cognito

def _cognito_available() -> bool:
    return bool(COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID)

# ── JWKS-based JWT validation (Cognito) ──────────────────────────────────

async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    url = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(url)
        r.raise_for_status()
        _jwks_cache = {k["kid"]: RSAAlgorithm.from_jwk(json.dumps(k)) for k in r.json()["keys"]}
    return _jwks_cache

async def _verify_cognito_token(token: str) -> dict:
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    keys = await _get_jwks()
    pub_key = keys.get(kid)
    if not pub_key:
        raise ValueError("Unknown token key id")
    return jwt.decode(
        token, pub_key,
        algorithms=["RS256"],
        options={"verify_aud": False},
    )

def _verify_mock_token(token: str) -> dict:
    return jwt.decode(token, _MOCK_SECRET, algorithms=["HS256"])

async def _decode_token(token: str) -> dict:
    if _cognito_available():
        return await _verify_cognito_token(token)
    if USE_MOCK_AUTH:
        return _verify_mock_token(token)
    raise HTTPException(status_code=500, detail="Auth not configured")

# ── FastAPI security ──────────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=False)

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[Dict[str, Any]]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = await _decode_token(credentials.credentials)
        return {"id": payload.get("sub"), "email": payload.get("email", ""), "name": payload.get("name", ""), "payload": payload}
    except Exception as e:
        logger.debug(f"Optional auth failed: {type(e).__name__}")
        return None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = await _decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user_id, "email": payload.get("email", ""), "name": payload.get("name", ""), "payload": payload}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ── Pydantic models ───────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: Optional[datetime] = None

class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse

class MessageResponse(BaseModel):
    message: str

# ── Mock helpers for local dev ────────────────────────────────────────────

def _mock_tokens(user_id: str, email: str, name: str) -> AuthTokenResponse:
    import time
    access = jwt.encode(
        {"sub": user_id, "email": email, "name": name, "exp": int(time.time()) + 3600},
        _MOCK_SECRET, algorithm="HS256"
    )
    refresh = jwt.encode(
        {"sub": user_id, "email": email, "type": "refresh", "exp": int(time.time()) + 86400 * 30},
        _MOCK_SECRET, algorithm="HS256"
    )
    return AuthTokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserResponse(id=user_id, email=email, name=name),
    )

# ── Route factory ─────────────────────────────────────────────────────────

def create_auth_api(app):
    router = APIRouter(prefix="/auth", tags=["auth"])

    @router.post("/register", response_model=AuthTokenResponse)
    async def register(body: RegisterRequest):
        if not _cognito_available():
            if USE_MOCK_AUTH:
                import uuid
                return _mock_tokens(str(uuid.uuid4()), body.email, body.name)
            raise HTTPException(status_code=503, detail="Auth service not configured")
        try:
            cog = _get_cognito()
            resp = await asyncio.to_thread(
                cog.sign_up,
                ClientId=COGNITO_CLIENT_ID,
                Username=body.email,
                Password=body.password,
                UserAttributes=[
                    {"Name": "email", "Value": body.email},
                    {"Name": "name", "Value": body.name},
                ],
            )
            user_id = resp["UserSub"]
            # Auto-confirm for dev (remove in prod — use email verification)
            if os.getenv("COGNITO_AUTO_CONFIRM", "false").lower() == "true":
                await asyncio.to_thread(
                    cog.admin_confirm_sign_up,
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=body.email,
                )
            # Login to get tokens
            auth_resp = await asyncio.to_thread(
                cog.initiate_auth,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={"USERNAME": body.email, "PASSWORD": body.password},
                ClientId=COGNITO_CLIENT_ID,
            )
            tokens = auth_resp["AuthenticationResult"]
            return AuthTokenResponse(
                access_token=tokens["AccessToken"],
                refresh_token=tokens["RefreshToken"],
                user=UserResponse(id=user_id, email=body.email, name=body.name),
            )
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code == "UsernameExistsException":
                raise HTTPException(status_code=409, detail="Email already registered")
            raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])

    @router.post("/login", response_model=AuthTokenResponse)
    async def login(body: LoginRequest):
        if not _cognito_available():
            if USE_MOCK_AUTH:
                import uuid
                return _mock_tokens(str(uuid.uuid4()), body.email, body.email.split("@")[0])
            raise HTTPException(status_code=503, detail="Auth service not configured")
        try:
            cog = _get_cognito()
            resp = await asyncio.to_thread(
                cog.initiate_auth,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={"USERNAME": body.email, "PASSWORD": body.password},
                ClientId=COGNITO_CLIENT_ID,
            )
            tokens = resp["AuthenticationResult"]
            payload = jwt.decode(tokens["IdToken"], options={"verify_signature": False})
            return AuthTokenResponse(
                access_token=tokens["AccessToken"],
                refresh_token=tokens["RefreshToken"],
                user=UserResponse(
                    id=payload.get("sub", ""),
                    email=payload.get("email", body.email),
                    name=payload.get("name", ""),
                ),
            )
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code in ("NotAuthorizedException", "UserNotFoundException"):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])

    @router.post("/refresh", response_model=AuthTokenResponse)
    async def refresh(body: RefreshRequest):
        if not _cognito_available():
            if USE_MOCK_AUTH:
                payload = jwt.decode(body.refresh_token, _MOCK_SECRET, algorithms=["HS256"])
                return _mock_tokens(payload["sub"], payload.get("email", ""), "")
            raise HTTPException(status_code=503, detail="Auth service not configured")
        try:
            cog = _get_cognito()
            resp = await asyncio.to_thread(
                cog.initiate_auth,
                AuthFlow="REFRESH_TOKEN_AUTH",
                AuthParameters={"REFRESH_TOKEN": body.refresh_token},
                ClientId=COGNITO_CLIENT_ID,
            )
            tokens = resp["AuthenticationResult"]
            payload = jwt.decode(tokens["AccessToken"], options={"verify_signature": False})
            return AuthTokenResponse(
                access_token=tokens["AccessToken"],
                refresh_token=body.refresh_token,  # Cognito doesn't re-issue refresh on REFRESH flow
                user=UserResponse(id=payload.get("sub", ""), email=payload.get("email", ""), name=""),
            )
        except ClientError as e:
            raise HTTPException(status_code=401, detail="Token refresh failed")

    @router.get("/me", response_model=UserResponse)
    async def me(user: Dict[str, Any] = Depends(get_current_user)):
        return UserResponse(id=user["id"], email=user["email"], name=user["name"])

    @router.post("/logout", response_model=MessageResponse)
    async def logout(user: Dict[str, Any] = Depends(get_current_user)):
        # Cognito: revoke access token (best-effort)
        if _cognito_available():
            try:
                token = user.get("payload", {}).get("jti")  # use token from header if needed
                # Global sign-out revokes all tokens for the user
                await asyncio.to_thread(
                    _get_cognito().admin_user_global_sign_out,
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=user["email"],
                )
            except Exception:
                pass  # best-effort
        return MessageResponse(message="Logged out successfully")

    @router.delete("/me/data", response_model=MessageResponse)
    async def delete_my_data(user: Dict[str, Any] = Depends(get_current_user)):
        """
        DPDPA / GDPR right to deletion.
        Deletes all user data cascading through all tables.
        """
        user_id = user["id"]
        try:
            from backend.database import get_db
            from sqlalchemy import text as sql_text
            async for db in get_db():
                # Cascade deletes via FK constraints — delete top-level rows only
                await db.execute(sql_text("DELETE FROM interview_sessions WHERE user_id = :uid"), {"uid": user_id})
                await db.execute(sql_text("DELETE FROM interview_blueprints WHERE user_id = :uid"), {"uid": user_id})
                await db.execute(sql_text("DELETE FROM candidate_profiles WHERE user_id = :uid"), {"uid": user_id})
                await db.execute(sql_text(
                    "UPDATE platform_users SET email=:anon, name='[deleted]', auth_provider_id=NULL "
                    "WHERE id = :uid",
                ), {"anon": f"deleted_{user_id}@deleted", "uid": user_id})
                await db.commit()
                break
        except Exception as e:
            logger.error(f"Data deletion error for user {user_id}: {type(e).__name__}")
            raise HTTPException(status_code=500, detail="Data deletion failed")

        # Delete from Cognito (best-effort)
        if _cognito_available():
            try:
                await asyncio.to_thread(
                    _get_cognito().admin_delete_user,
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=user["email"],
                )
            except Exception:
                pass

        logger.info(f"User data deleted: user_id={user_id}")
        return MessageResponse(message="All your data has been deleted.")

    app.include_router(router)
    logger.info("Auth API routes registered (Cognito backend)")
