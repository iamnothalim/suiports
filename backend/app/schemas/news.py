from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class TagSchema(BaseModel):
    type: str
    name: str
    image: str

class NewsBase(BaseModel):
    time: str
    title: str
    content: str
    source: str
    team: str
    league: str
    likes: int = 0
    comments: int = 0
    shares: int = 0
    date: str
    tags: List[TagSchema] = []

class NewsCreate(NewsBase):
    pass

class NewsResponse(NewsBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class NewsListResponse(BaseModel):
    news: List[NewsResponse]
    total: int
    page: int
    size: int
