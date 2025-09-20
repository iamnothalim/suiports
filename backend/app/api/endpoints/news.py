from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.database import get_db, News
from app.schemas.news import NewsResponse, NewsCreate, NewsListResponse

router = APIRouter()

@router.get("/", response_model=NewsListResponse)
async def get_news(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    league: Optional[str] = None,
    team: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """뉴스 목록 조회"""
    query = db.query(News)
    
    # 필터링
    if league:
        query = query.filter(News.league == league)
    if team:
        query = query.filter(News.team == team)
    
    # 총 개수
    total = query.count()
    
    # 페이지네이션
    offset = (page - 1) * size
    news = query.order_by(News.created_at.desc()).offset(offset).limit(size).all()
    
    return NewsListResponse(
        news=news,
        total=total,
        page=page,
        size=size
    )

@router.get("/{news_id}", response_model=NewsResponse)
async def get_news_by_id(news_id: int, db: Session = Depends(get_db)):
    """특정 뉴스 조회"""
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    return news

@router.post("/", response_model=NewsResponse)
async def create_news(news: NewsCreate, db: Session = Depends(get_db)):
    """새 뉴스 생성"""
    db_news = News(**news.dict())
    db.add(db_news)
    db.commit()
    db.refresh(db_news)
    return db_news

@router.post("/bulk", response_model=List[NewsResponse])
async def create_news_bulk(news_list: List[NewsCreate], db: Session = Depends(get_db)):
    """여러 뉴스 일괄 생성"""
    db_news_list = []
    for news in news_list:
        db_news = News(**news.dict())
        db.add(db_news)
        db_news_list.append(db_news)
    
    db.commit()
    for db_news in db_news_list:
        db.refresh(db_news)
    
    return db_news_list

@router.put("/{news_id}", response_model=NewsResponse)
async def update_news(news_id: int, news: NewsCreate, db: Session = Depends(get_db)):
    """뉴스 수정"""
    db_news = db.query(News).filter(News.id == news_id).first()
    if not db_news:
        raise HTTPException(status_code=404, detail="News not found")
    
    for key, value in news.dict().items():
        setattr(db_news, key, value)
    
    db.commit()
    db.refresh(db_news)
    return db_news

@router.delete("/{news_id}")
async def delete_news(news_id: int, db: Session = Depends(get_db)):
    """뉴스 삭제"""
    db_news = db.query(News).filter(News.id == news_id).first()
    if not db_news:
        raise HTTPException(status_code=404, detail="News not found")
    
    db.delete(db_news)
    db.commit()
    return {"message": "News deleted successfully"}
