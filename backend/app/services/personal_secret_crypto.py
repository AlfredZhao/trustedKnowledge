import base64
import hashlib
import os
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings


KEY_VERSION = 1
MIN_SECRET_LENGTH = 32


class PersonalSecretCryptoError(RuntimeError):
    pass


@dataclass(frozen=True)
class EncryptedValue:
    cipher: str
    nonce: str
    key_version: int = KEY_VERSION


def encrypt_personal_secret(value: str | None, *, aad: str) -> EncryptedValue | None:
    if value is None:
        return None
    key = _load_master_key()
    nonce = os.urandom(12)
    cipher = AESGCM(key).encrypt(nonce, value.encode("utf-8"), aad.encode("utf-8"))
    return EncryptedValue(
        cipher=base64.b64encode(cipher).decode("ascii"),
        nonce=base64.b64encode(nonce).decode("ascii"),
    )


def decrypt_personal_secret(cipher: str | None, nonce: str | None, *, aad: str) -> str | None:
    if not cipher or not nonce:
        return None
    key = _load_master_key()
    try:
        plaintext = AESGCM(key).decrypt(
            base64.b64decode(nonce.encode("ascii")),
            base64.b64decode(cipher.encode("ascii")),
            aad.encode("utf-8"),
        )
    except Exception as exc:
        raise PersonalSecretCryptoError("Personal secret decryption failed") from exc
    return plaintext.decode("utf-8")


def _load_master_key() -> bytes:
    secret = getattr(settings, "personal_secret_key", "").strip()
    if len(secret) < MIN_SECRET_LENGTH:
        raise PersonalSecretCryptoError(
            "Personal secret storage is not configured. Set TRUSTED_KNOWLEDGE_PERSONAL_SECRET_KEY to at least 32 characters."
        )
    return hashlib.sha256(secret.encode("utf-8")).digest()
