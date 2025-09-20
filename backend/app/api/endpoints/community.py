from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.database import get_db, CommunityPost
from app.schemas.community import CommunityPostResponse, CommunityPostCreate, CommunityPostListResponse

router = APIRouter()

@router.get("/", response_model=CommunityPostListResponse)
async def get_community_posts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    is_hot: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """커뮤니티 포스트 목록 조회"""
    query = db.query(CommunityPost)
    
    # 필터링
    if category:
        query = query.filter(CommunityPost.category == category)
    if is_hot is not None:
        query = query.filter(CommunityPost.is_hot == is_hot)
    
    # 총 개수
    total = query.count()
    
    # 페이지네이션
    offset = (page - 1) * size
    posts = query.order_by(CommunityPost.created_at.desc()).offset(offset).limit(size).all()
    
    return CommunityPostListResponse(
        posts=posts,
        total=total,
        page=page,
        size=size
    )

@router.get("/{post_id}", response_model=CommunityPostResponse)
async def get_community_post_by_id(post_id: int, db: Session = Depends(get_db)):
    """특정 커뮤니티 포스트 조회"""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found")
    return post

@router.post("/", response_model=CommunityPostResponse)
async def create_community_post(post: CommunityPostCreate, db: Session = Depends(get_db)):
    """새 커뮤니티 포스트 생성"""
    db_post = CommunityPost(**post.dict())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@router.post("/bulk", response_model=List[CommunityPostResponse])
async def create_community_posts_bulk(posts: List[CommunityPostCreate], db: Session = Depends(get_db)):
    """여러 커뮤니티 포스트 일괄 생성"""
    db_posts = []
    for post in posts:
        db_post = CommunityPost(**post.dict())
        db.add(db_post)
        db_posts.append(db_post)
    
    db.commit()
    for db_post in db_posts:
        db.refresh(db_post)
    
    return db_posts

@router.put("/{post_id}", response_model=CommunityPostResponse)
async def update_community_post(post_id: int, post: CommunityPostCreate, db: Session = Depends(get_db)):
    """커뮤니티 포스트 수정"""
    db_post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Community post not found")
    
    for key, value in post.dict().items():
        setattr(db_post, key, value)
    
    db.commit()
    db.refresh(db_post)
    return db_post

@router.delete("/{post_id}")
async def delete_community_post(post_id: int, db: Session = Depends(get_db)):
    """커뮤니티 포스트 삭제"""
    db_post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Community post not found")
    
    db.delete(db_post)
    db.commit()
    return {"message": "Community post deleted successfully"}
