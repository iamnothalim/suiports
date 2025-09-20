from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.database import get_db, PredictionEvent, User
from sqlalchemy.orm import joinedload
from app.schemas.prediction import PredictionEventCreate, PredictionEventResponse, PredictionEventApproval
from app.api.endpoints.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=PredictionEventResponse)
async def create_prediction_event(
    prediction: PredictionEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """예측 이벤트 생성"""
    from datetime import datetime, timedelta
    
    # 만료 시간 계산
    expires_at = datetime.utcnow() + timedelta(hours=prediction.duration)
    
    db_prediction = PredictionEvent(
        game_id=prediction.game_id,
        prediction=prediction.prediction,
        option_a=prediction.option_a,
        option_b=prediction.option_b,
        duration=prediction.duration,
        deadline=prediction.deadline,
        creator_id=current_user.id,
        status="pending",
        expires_at=expires_at,
        user_address=prediction.user_address
    )
    
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)
    
    return db_prediction

@router.get("/pending", response_model=List[PredictionEventResponse])
async def get_pending_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """대기 중인 예측 이벤트 조회 (Admin만)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )
    
    predictions = db.query(PredictionEvent).filter(
        PredictionEvent.status == "pending"
    ).all()
    
    # creator 정보 추가
    for prediction in predictions:
        creator = db.query(User).filter(User.id == prediction.creator_id).first()
        prediction.creator = creator.username if creator else "Unknown"
    
    return predictions

@router.get("/", response_model=List[PredictionEventResponse])
async def get_all_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """모든 예측 이벤트 조회 (Admin만)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )
    
    predictions = db.query(PredictionEvent).all()
    
    # creator 정보 추가
    for prediction in predictions:
        creator = db.query(User).filter(User.id == prediction.creator_id).first()
        prediction.creator = creator.username if creator else "Unknown"
    
    return predictions

@router.get("/approved", response_model=List[PredictionEventResponse])
async def get_approved_predictions(
    db: Session = Depends(get_db)
):
    """승인된 예측 이벤트 조회 (모든 사용자)"""
    predictions = db.query(PredictionEvent).filter(
        PredictionEvent.status == "approved"
    ).all()
    
    # creator 정보 추가
    for prediction in predictions:
        creator = db.query(User).filter(User.id == prediction.creator_id).first()
        prediction.creator = creator.username if creator else "Unknown"
    
    return predictions

@router.put("/{prediction_id}/approve", response_model=PredictionEventResponse)
async def approve_prediction(
    prediction_id: int,
    approval: PredictionEventApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """예측 이벤트 승인/거부 (Admin만)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )
    
    prediction = db.query(PredictionEvent).filter(
        PredictionEvent.id == prediction_id
    ).first()
    
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="예측 이벤트를 찾을 수 없습니다"
        )
    
    prediction.status = approval.status
    db.commit()
    db.refresh(prediction)
    
    return prediction
