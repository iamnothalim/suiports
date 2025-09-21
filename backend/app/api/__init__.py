from fastapi import APIRouter
from .endpoints import health, users, news, community, standings, auth, predictions, scoring, bets

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(community.router, prefix="/community", tags=["community"])
api_router.include_router(standings.router, prefix="/standings", tags=["standings"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
api_router.include_router(scoring.router, prefix="/scoring", tags=["scoring"])
api_router.include_router(bets.router, prefix="/bets", tags=["bets"])
