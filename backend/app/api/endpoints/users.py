from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

router = APIRouter()

class User(BaseModel):
    id: int
    name: str
    email: str

class UserCreate(BaseModel):
    name: str
    email: str

# 임시 데이터
users_db = [
    User(id=1, name="홍길동", email="hong@example.com"),
    User(id=2, name="김철수", email="kim@example.com"),
]

@router.get("/", response_model=List[User])
async def get_users():
    return users_db

@router.get("/{user_id}", response_model=User)
async def get_user(user_id: int):
    user = next((user for user in users_db if user.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=User)
async def create_user(user: UserCreate):
    new_user = User(
        id=len(users_db) + 1,
        name=user.name,
        email=user.email
    )
    users_db.append(new_user)
    return new_user
