from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# 사용자 생성 스키마
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

# 사용자 로그인 스키마
class UserLogin(BaseModel):
    username: str
    password: str

# 사용자 응답 스키마
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# 토큰 스키마
class Token(BaseModel):
    access_token: str
    token_type: str

# 토큰 데이터 스키마
class TokenData(BaseModel):
    username: Optional[str] = None
