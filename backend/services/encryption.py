"""
Application-level field encryption — V2.8.

Encrypts sensitive text columns (answer_text, resume raw_text) before INSERT
and decrypts on SELECT using AWS KMS data key envelope encryption.

When KMS is not configured (local dev), falls back to Fernet symmetric
encryption using a local key derived from SECRET_KEY.

Usage:
    enc = get_encryptor()
    ciphertext = enc.encrypt("candidate said something sensitive")
    plaintext  = enc.decrypt(ciphertext)
"""

import base64
import hashlib
import logging
import os
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)

# ── Fernet fallback (local dev / no KMS) ─────────────────────────────────

def _derive_fernet_key(secret: str) -> bytes:
    """Derive a 32-byte Fernet key from SECRET_KEY via SHA-256."""
    return base64.urlsafe_b64encode(
        hashlib.sha256(secret.encode()).digest()
    )


class _FernetEncryptor:
    def __init__(self, key: bytes):
        try:
            from cryptography.fernet import Fernet
            self._f = Fernet(key)
        except ImportError:
            raise RuntimeError("cryptography package required: pip install cryptography")

    def encrypt(self, plaintext: str) -> str:
        if not plaintext:
            return plaintext
        return self._f.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        if not ciphertext:
            return ciphertext
        try:
            return self._f.decrypt(ciphertext.encode()).decode()
        except Exception:
            # Return as-is if not encrypted (backwards compat)
            return ciphertext


# ── KMS envelope encryption ───────────────────────────────────────────────

class _KMSEncryptor:
    """
    AWS KMS envelope encryption:
    1. Generate a data key from KMS (plaintext + ciphertext blob)
    2. Encrypt data with plaintext data key (Fernet)
    3. Store: base64(kms_blob) + ":" + base64(fernet_ciphertext)
    4. On decrypt: call KMS to decrypt the blob → get data key → decrypt data
    """

    def __init__(self, key_id: str, region: str):
        import boto3
        self._kms = boto3.client("kms", region_name=region)
        self._key_id = key_id

    def encrypt(self, plaintext: str) -> str:
        if not plaintext:
            return plaintext
        import boto3
        from cryptography.fernet import Fernet

        resp = self._kms.generate_data_key(KeyId=self._key_id, KeySpec="AES_256")
        plaintext_key = base64.urlsafe_b64encode(resp["Plaintext"])
        encrypted_key = base64.b64encode(resp["CiphertextBlob"]).decode()

        fernet_cipher = Fernet(plaintext_key).encrypt(plaintext.encode()).decode()
        return f"{encrypted_key}:{fernet_cipher}"

    def decrypt(self, ciphertext: str) -> str:
        if not ciphertext or ":" not in ciphertext:
            return ciphertext
        try:
            from cryptography.fernet import Fernet
            encrypted_key_b64, fernet_cipher = ciphertext.split(":", 1)
            encrypted_key = base64.b64decode(encrypted_key_b64)
            resp = self._kms.decrypt(CiphertextBlob=encrypted_key)
            plaintext_key = base64.urlsafe_b64encode(resp["Plaintext"])
            return Fernet(plaintext_key).decrypt(fernet_cipher.encode()).decode()
        except Exception as e:
            logger.warning(f"Decryption failed ({type(e).__name__}) — returning raw value")
            return ciphertext


# ── Factory ───────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_encryptor():
    """Return the appropriate encryptor based on environment configuration."""
    kms_key_id = os.getenv("KMS_KEY_ID", "")
    region = os.getenv("AWS_REGION", "us-east-1")

    if kms_key_id:
        try:
            enc = _KMSEncryptor(kms_key_id, region)
            logger.info(f"Encryption: AWS KMS (key={kms_key_id[:8]}...)")
            return enc
        except Exception as e:
            logger.warning(f"KMS init failed ({e}) — falling back to Fernet")

    secret = os.getenv("SECRET_KEY", "dev-secret-not-for-production")
    key = _derive_fernet_key(secret)
    logger.info("Encryption: Fernet (local dev mode — use KMS_KEY_ID in prod)")
    return _FernetEncryptor(key)


def encrypt_field(value: Optional[str]) -> Optional[str]:
    """Encrypt a nullable text field. Returns None if value is None."""
    if value is None:
        return None
    return get_encryptor().encrypt(value)


def decrypt_field(value: Optional[str]) -> Optional[str]:
    """Decrypt a nullable text field. Returns None if value is None."""
    if value is None:
        return None
    return get_encryptor().decrypt(value)
