from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BetCreate(BaseModel):
    prediction_id: int
    user_address: str
    option: str
    amount: float
    transaction_hash: Optional[str] = None
    pool_id: Optional[str] = None

class BetResponse(BaseModel):
    id: int
    prediction_id: int
    user_id: int
    user_address: str
    option: str
    amount: float
    transaction_hash: Optional[str] = None
    pool_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserBetsResponse(BaseModel):
    prediction_id: int
    option: str
    amount: float
    transaction_hash: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
