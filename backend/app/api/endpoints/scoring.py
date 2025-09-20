from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.database import get_db, PredictionEvent, PredictionScore, User
from app.schemas.scoring import PredictionScore as PredictionScoreSchema, ScoringRequest
from app.api.endpoints.auth import get_current_user
from app.services.ai_scoring import AIScoringService

router = APIRouter()

@router.post("/calculate/{prediction_id}", response_model=PredictionScoreSchema)
async def calculate_prediction_score(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """예측 이벤트에 대한 AI 점수 계산"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )
    
    # 예측 이벤트 조회
    prediction = db.query(PredictionEvent).filter(
        PredictionEvent.id == prediction_id
    ).first()
    
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="예측 이벤트를 찾을 수 없습니다"
        )
    
    # 기존 점수가 있는지 확인
    existing_score = db.query(PredictionScore).filter(
        PredictionScore.prediction_id == prediction_id
    ).first()
    
    if existing_score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 점수가 계산된 예측입니다"
        )
    
    # AI 점수 계산
    ai_service = AIScoringService()
    
    scoring_data = {
        'game_id': prediction.game_id,
        'prediction': prediction.prediction,
        'option_a': prediction.option_a,
        'option_b': prediction.option_b,
        'creator_username': 'unknown',  # TODO: 사용자 정보 조회
        'creator_activity_days': 0,
        'creator_contribution_score': 0.0
    }
    
    score_result = ai_service.calculate_prediction_score(scoring_data)
    
    # 데이터베이스에 점수 저장
    db_score = PredictionScore(
        prediction_id=prediction_id,
        quality_score=score_result['quality_score'],
        demand_score=score_result['demand_score'],
        reputation_score=score_result['reputation_score'],
        novelty_score=score_result['novelty_score'],
        economic_score=score_result['economic_score'],
        total_score=score_result['total_score'],
        quality_details=score_result['quality_details'],
        demand_details=score_result['demand_details'],
        reputation_details=score_result['reputation_details'],
        novelty_details=score_result['novelty_details'],
        economic_details=score_result['economic_details'],
        ai_reasoning=score_result['ai_reasoning']
    )
    
    db.add(db_score)
    db.commit()
    db.refresh(db_score)
    
    return db_score

@router.get("/{prediction_id}", response_model=PredictionScoreSchema)
async def get_prediction_score(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """예측 이벤트의 AI 점수 조회"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )
    
    score = db.query(PredictionScore).filter(
        PredictionScore.prediction_id == prediction_id
    ).first()
    
    if not score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="점수가 계산되지 않은 예측입니다"
        )
    
    return score

@router.get("/", response_model=List[PredictionScoreSchema])
async def get_all_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """모든 예측 이벤트의 AI 점수 조회"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )
    
    scores = db.query(PredictionScore).all()
    return scores
