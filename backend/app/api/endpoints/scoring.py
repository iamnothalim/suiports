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

@router.post("/batch-calculate", response_model=List[PredictionScoreSchema])
async def batch_calculate_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """스코어링되지 않은 모든 예측 이벤트에 대해 일괄 AI 점수 계산"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )
    
    # 스코어링되지 않은 예측 이벤트들 조회
    unscored_predictions = db.query(PredictionEvent).filter(
        ~PredictionEvent.id.in_(
            db.query(PredictionScore.prediction_id)
        )
    ).all()
    
    if not unscored_predictions:
        return []
    
    ai_service = AIScoringService()
    calculated_scores = []
    
    for prediction in unscored_predictions:
        try:
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
                prediction_id=prediction.id,
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
            calculated_scores.append(db_score)
            time.sleep(1)
        except Exception as e:
            print(f"Error calculating score for prediction {prediction.id}: {e}")
            continue
    
    db.commit()
    
    # 저장된 점수들을 새로고침하여 반환
    for score in calculated_scores:
        db.refresh(score)
    
    return calculated_scores

@router.post("/batch-calculate-and-select", response_model=dict)
async def batch_calculate_and_select_best(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """스코어링되지 않은 모든 예측 이벤트에 대해 일괄 AI 점수 계산 후 가장 높은 점수의 예측을 자동 선택하여 승인"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )
    
    # 스코어링되지 않은 예측 이벤트들 조회 (pending 상태이거나 스코어가 없는 것들)
    unscored_predictions = db.query(PredictionEvent).filter(
        ~PredictionEvent.id.in_(
            db.query(PredictionScore.prediction_id)
        )
    ).all()
    
    if not unscored_predictions:
        return {
            "message": "No unscored predictions found",
            "selected_prediction": None,
            "calculated_scores": []
        }
    
    ai_service = AIScoringService()
    calculated_scores = []
    
    # 모든 예측에 대해 스코어링 수행
    for prediction in unscored_predictions:
        try:
            scoring_data = {
                'game_id': prediction.game_id,
                'prediction': prediction.prediction,
                'option_a': prediction.option_a,
                'option_b': prediction.option_b,
                'creator_username': 'unknown',
                'creator_activity_days': 0,
                'creator_contribution_score': 0.0
            }
            
            score_result = ai_service.calculate_prediction_score(scoring_data)
            
            # 데이터베이스에 점수 저장
            db_score = PredictionScore(
                prediction_id=prediction.id,
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
            calculated_scores.append({
                'prediction_id': prediction.id,
                'game_id': prediction.game_id,
                'prediction': prediction.prediction,
                'total_score': score_result['total_score']
            })
            
        except Exception as e:
            print(f"Error calculating score for prediction {prediction.id}: {e}")
            continue
    
    db.commit()
    
    # 가장 높은 점수의 예측 찾기
    if calculated_scores:
        best_score = max(calculated_scores, key=lambda x: x['total_score'])
        best_prediction_id = best_score['prediction_id']
        
        # 가장 높은 점수의 예측을 승인 상태로 변경
        best_prediction = db.query(PredictionEvent).filter(
            PredictionEvent.id == best_prediction_id
        ).first()
        
        if best_prediction:
            # 1위 예측을 승인
            best_prediction.status = "approved"
            
            # 나머지 모든 pending 예측들을 삭제
            deleted_count = 0
            for prediction in unscored_predictions:
                if prediction.id != best_prediction_id:
                    # 관련된 점수도 함께 삭제
                    db.query(PredictionScore).filter(
                        PredictionScore.prediction_id == prediction.id
                    ).delete()
                    # 예측 이벤트 삭제
                    db.delete(prediction)
                    deleted_count += 1
            
            db.commit()
            
            return {
                "message": f"Batch scoring completed. Selected prediction with highest score: {best_score['total_score']:.2f}. Deleted {deleted_count} other pending predictions.",
                "selected_prediction": {
                    "id": best_prediction.id,
                    "game_id": best_prediction.game_id,
                    "prediction": best_prediction.prediction,
                    "option_a": best_prediction.option_a,
                    "option_b": best_prediction.option_b,
                    "deadline": best_prediction.deadline,
                    "expires_at": best_prediction.expires_at,
                    "user_address": best_prediction.user_address,
                    "total_score": best_score['total_score'],
                    "status": "approved"
                },
                "deleted_count": deleted_count,
                "calculated_scores": calculated_scores
            }
    
    return {
        "message": "Batch scoring completed but no prediction was selected",
        "selected_prediction": None,
        "calculated_scores": calculated_scores
    }

@router.get("/", response_model=List[PredictionScoreSchema])
async def get_all_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """모든 예측 이벤트의 AI 점수 조회 (총점 순으로 정렬)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin 권한이 필요합니다"
        )
    
    scores = db.query(PredictionScore).order_by(PredictionScore.total_score.desc()).all()
    return scores
