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
    pool_id: Optional[str] = None  # Sui 컨트랙트 Pool ID

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
    pool_id: Optional[str] = None  # Sui 컨트랙트 Pool ID
    creator: Optional[str] = None
    
    class Config:
        from_attributes = True

# 예측 이벤트 승인 스키마
class PredictionEventApproval(BaseModel):
    status: str  # approved, rejected

# Pool ID 업데이트 스키마
class PredictionEventPoolUpdate(BaseModel):
    pool_id: str  # Sui 컨트랙트 Pool ID
