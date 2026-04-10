import uuid
from cryptography.fernet import Fernet
from core.config import settings

_fernet: Fernet | None = None


def get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(settings.aes_secret_key.encode())
    return _fernet


def generate_uid() -> str:
    """Generate a fresh UUID4 as the member's raw UID."""
    return str(uuid.uuid4())


def encrypt_uid(raw_uid: str) -> str:
    """Encrypt a raw UID string. Returns a URL-safe base64 token."""
    return get_fernet().encrypt(raw_uid.encode()).decode()


def decrypt_uid(encrypted_uid: str) -> str:
    """Decrypt an encrypted UID token. Raises InvalidToken if tampered."""
    return get_fernet().decrypt(encrypted_uid.encode()).decode()


def verify_uid(encrypted_uid: str, expected_raw: str) -> bool:
    try:
        return decrypt_uid(encrypted_uid) == expected_raw
    except Exception:
        return False
