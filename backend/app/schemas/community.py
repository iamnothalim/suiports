from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CommunityPostBase(BaseModel):
    category: str
    title: str
    content: Optional[str] = None
    author: str
    time: str
    replies: int = 0
    likes: int = 0
    is_hot: bool = False
    is_bookmarked: bool = False

class CommunityPostCreate(CommunityPostBase):
    pass

class CommunityPostResponse(CommunityPostBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class CommunityPostListResponse(BaseModel):
    posts: list[CommunityPostResponse]
    total: int
    page: int
    size: int
