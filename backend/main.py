from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.api import api_router
from app.core.config import settings
from app.models.database import create_tables

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Sui Ports API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 데이터베이스 테이블 생성
create_tables()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router, prefix=settings.API_V1_STR)

# 정적 파일 서빙 (프론트엔드 빌드 파일)
if os.path.exists("../frontend/dist"):
    app.mount("/static", StaticFiles(directory="../frontend/dist"), name="static")
    
    @app.get("/")
    async def read_index():
        return FileResponse("../frontend/dist/index.html")

@app.get("/health")
async def health_check():
    return {"message": "Backend is running!", "status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
