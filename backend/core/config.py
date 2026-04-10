from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Brevo
    brevo_api_key: str

    # Crypto — Fernet key for UID encryption
    aes_secret_key: str

    # App
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"

    # Email sender
    sender_email: str = "chathuryastudentdevclub@gmail.com"
    sender_name: str = "Chathurya Student Developers Club"


settings = Settings()  # type: ignore[call-arg]
