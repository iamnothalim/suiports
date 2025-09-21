from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ...models.database import get_db, Bet, User, PredictionEvent
from ...schemas.bet import BetCreate, BetResponse, UserBetsResponse
from ...core.security import get_current_user

router = APIRouter()

@router.post("/", response_model=BetResponse)
def create_bet(
    bet_data: BetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """베팅 생성"""
    # 예측 이벤트 존재 확인
    prediction = db.query(PredictionEvent).filter(
        PredictionEvent.id == bet_data.prediction_id
    ).first()
    
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction event not found"
        )
    
    # 이미 베팅했는지 확인
    existing_bet = db.query(Bet).filter(
        Bet.prediction_id == bet_data.prediction_id,
        Bet.user_id == current_user.id
    ).first()
    
    if existing_bet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already placed a bet on this prediction"
        )
    
    # 베팅 생성
    bet = Bet(
        prediction_id=bet_data.prediction_id,
        user_id=current_user.id,
        user_address=bet_data.user_address,
        option=bet_data.option,
        amount=bet_data.amount,
        transaction_hash=bet_data.transaction_hash,
        pool_id=bet_data.pool_id
    )
    
    db.add(bet)
    db.commit()
    db.refresh(bet)
    
    return bet

@router.get("/user/{user_address}", response_model=List[UserBetsResponse])
def get_user_bets(
    user_address: str,
    db: Session = Depends(get_db)
):
    """사용자의 베팅 목록 조회 (지갑 주소 기준)"""
    bets = db.query(Bet).filter(
        Bet.user_address == user_address
    ).order_by(Bet.created_at.desc()).all()
    
    return bets

@router.get("/prediction/{prediction_id}", response_model=List[BetResponse])
def get_prediction_bets(
    prediction_id: int,
    db: Session = Depends(get_db)
):
    """특정 예측 이벤트의 모든 베팅 조회"""
    bets = db.query(Bet).filter(
        Bet.prediction_id == prediction_id
    ).order_by(Bet.created_at.desc()).all()
    
    return bets

@router.get("/user-bets-summary/{user_id}")
def get_user_bets_summary(
    user_id: int,
    db: Session = Depends(get_db)
):
    """사용자 베팅 요약 정보 (예측 ID별 베팅 정보)"""
    bets = db.query(Bet).filter(
        Bet.user_id == user_id
    ).all()
    
    # 예측 ID별로 베팅 정보 정리
    bets_summary = {}
    for bet in bets:
        bets_summary[bet.prediction_id] = {
            "option": bet.option,
            "amount": bet.amount,
            "transaction_hash": bet.transaction_hash,
            "created_at": bet.created_at
        }
    
    return bets_summary
