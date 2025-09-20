from pydantic_settings import BaseSettings
from typing import List, Union
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sui Ports"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS 설정
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:8000",
    ]
    
    # 데이터베이스 설정
    DATABASE_URL: str = "sqlite:///./app.db"
    
    # JWT 설정
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Redis 설정
    REDIS_URL: str = "redis://localhost:6379"
    
    # AI 설정
    GEMINI_API_KEY: str = "your-gemini-api-key-here"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
