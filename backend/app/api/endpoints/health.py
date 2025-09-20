from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def health_check():
    return {"message": "API is healthy!", "status": "ok"}

@router.get("/detailed")
async def detailed_health_check():
    return {
        "status": "healthy",
        "message": "All systems operational",
        "version": "1.0.0",
        "timestamp": "2024-01-01T00:00:00Z"
    }
