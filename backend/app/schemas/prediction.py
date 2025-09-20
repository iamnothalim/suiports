from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 예측 이벤트 생성 스키마
class PredictionEventCreate(BaseModel):
    game_id: str
    prediction: str
    option_a: str
    option_b: str
    duration: int
    deadline: Optional[str] = None  # deadline date
    user_address: Optional[str] = None

# 예측 이벤트 응답 스키마
class PredictionEventResponse(BaseModel):
    id: int
    game_id: str
    prediction: str
    option_a: str
    option_b: str
    duration: int
    deadline: Optional[str] = None  # deadline date
    creator_id: int
    status: str
    created_at: datetime
    expires_at: Optional[datetime]
    total_bets: int
    total_amount: int
    user_address: Optional[str] = None
    creator: Optional[str] = None
    
    class Config:
        from_attributes = True

# 예측 이벤트 승인 스키마
class PredictionEventApproval(BaseModel):
    status: str  # approved, rejected
