from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.database import get_db, LeagueStanding
from app.schemas.standings import LeagueStandingResponse, LeagueStandingCreate, LeagueStandingsResponse

router = APIRouter()

@router.get("/", response_model=List[LeagueStandingsResponse])
async def get_all_standings(db: Session = Depends(get_db)):
    """모든 리그 순위 조회"""
    standings = db.query(LeagueStanding).order_by(LeagueStanding.league, LeagueStanding.rank).all()
    
    # 리그별로 그룹화
    leagues = {}
    for standing in standings:
        if standing.league not in leagues:
            leagues[standing.league] = []
        leagues[standing.league].append(standing)
    
    result = []
    for league, league_standings in leagues.items():
        result.append(LeagueStandingsResponse(
            league=league,
            standings=league_standings
        ))
    
    return result

@router.get("/{league}", response_model=LeagueStandingsResponse)
async def get_standings_by_league(league: str, db: Session = Depends(get_db)):
    """특정 리그 순위 조회"""
    standings = db.query(LeagueStanding).filter(LeagueStanding.league == league).order_by(LeagueStanding.rank).all()
    
    if not standings:
        raise HTTPException(status_code=404, detail=f"Standings for league '{league}' not found")
    
    return LeagueStandingsResponse(
        league=league,
        standings=standings
    )

@router.post("/", response_model=LeagueStandingResponse)
async def create_standing(standing: LeagueStandingCreate, db: Session = Depends(get_db)):
    """새 순위 생성"""
    db_standing = LeagueStanding(**standing.dict())
    db.add(db_standing)
    db.commit()
    db.refresh(db_standing)
    return db_standing

@router.post("/bulk", response_model=List[LeagueStandingResponse])
async def create_standings_bulk(standings: List[LeagueStandingCreate], db: Session = Depends(get_db)):
    """여러 순위 일괄 생성"""
    db_standings = []
    for standing in standings:
        db_standing = LeagueStanding(**standing.dict())
        db.add(db_standing)
        db_standings.append(db_standing)
    
    db.commit()
    for db_standing in db_standings:
        db.refresh(db_standing)
    
    return db_standings

@router.put("/{standing_id}", response_model=LeagueStandingResponse)
async def update_standing(standing_id: int, standing: LeagueStandingCreate, db: Session = Depends(get_db)):
    """순위 수정"""
    db_standing = db.query(LeagueStanding).filter(LeagueStanding.id == standing_id).first()
    if not db_standing:
        raise HTTPException(status_code=404, detail="Standing not found")
    
    for key, value in standing.dict().items():
        setattr(db_standing, key, value)
    
    db.commit()
    db.refresh(db_standing)
    return db_standing

@router.delete("/{standing_id}")
async def delete_standing(standing_id: int, db: Session = Depends(get_db)):
    """순위 삭제"""
    db_standing = db.query(LeagueStanding).filter(LeagueStanding.id == standing_id).first()
    if not db_standing:
        raise HTTPException(status_code=404, detail="Standing not found")
    
    db.delete(db_standing)
    db.commit()
    return {"message": "Standing deleted successfully"}
