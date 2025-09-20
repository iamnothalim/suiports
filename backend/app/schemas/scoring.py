from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

# AI 평가 점수 스키마
class PredictionScore(BaseModel):
    id: Optional[int] = None
    prediction_id: int
    quality_score: float  # 품질/해결 가능성 (35%)
    demand_score: float   # 수요/트렌드 신호 (25%)
    reputation_score: float  # 제안자 신뢰/기여 (20%)
    novelty_score: float  # 선점/중복도 (10%)
    economic_score: float  # 경제성/운영성 (10%)
    total_score: float    # 총점
    quality_details: Dict[str, Any]  # 품질 세부 점수
    demand_details: Dict[str, Any]   # 수요 세부 점수
    reputation_details: Dict[str, Any]  # 신뢰 세부 점수
    novelty_details: Dict[str, Any]  # 선점 세부 점수
    economic_details: Dict[str, Any]  # 경제성 세부 점수
    ai_reasoning: str     # AI 추론 과정
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# AI 평가 요청 스키마
class ScoringRequest(BaseModel):
    prediction_id: int
    game_id: str
    prediction: str
    option_a: str
    option_b: str
    creator_username: str
    creator_activity_days: Optional[int] = 0
    creator_contribution_score: Optional[float] = 0.0
