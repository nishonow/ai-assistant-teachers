from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_URL: str
    OPENAI_API_KEY: str
    ADMIN_SECRET_TOKEN: str

    class Config:
        env_file = ".env"

settings = Settings()