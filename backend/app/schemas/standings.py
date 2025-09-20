from pydantic import BaseModel
from typing import List
from datetime import datetime

class LeagueStandingBase(BaseModel):
    league: str
    rank: int
    team: str
    played: int = 0
    won: int = 0
    drawn: int = 0
    lost: int = 0
    goals_for: int = 0
    goals_against: int = 0
    goal_diff: int = 0
    points: int = 0
    form: List[str] = []

class LeagueStandingCreate(LeagueStandingBase):
    pass

class LeagueStandingResponse(LeagueStandingBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class LeagueStandingsResponse(BaseModel):
    league: str
    standings: List[LeagueStandingResponse]
