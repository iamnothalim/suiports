#!/usr/bin/env python3
"""
데이터베이스 초기화 및 샘플 데이터 삽입 스크립트
"""

import json
from sqlalchemy.orm import Session
from app.models.database import engine, SessionLocal, create_tables, News, CommunityPost, LeagueStanding, User, PredictionEvent
from app.schemas.news import NewsCreate
from app.schemas.community import CommunityPostCreate
from app.schemas.standings import LeagueStandingCreate

def init_database():
    """데이터베이스 테이블 생성"""
    print("Creating database tables...")
    create_tables()
    print("Database tables created successfully!")

def insert_sample_data():
    """샘플 데이터 삽입"""
    db = SessionLocal()
    
    try:
        # 기존 데이터 삭제
        print("Clearing existing data...")
        db.query(News).delete()
        db.query(CommunityPost).delete()
        db.query(LeagueStanding).delete()
        db.query(User).delete()
        db.commit()
        
        # 뉴스 데이터 삽입 (main.tsx의 모든 데이터)
        print("Inserting news data...")
        news_data = [
            {
                "time": "12:15",
                "title": "Lee Kang-in returns early from PSG training due to injury",
                "content": "Lee Kang-in suffered an ankle injury during PSG training today and has returned early. The medical staff announced that a 2-3 week recovery period is expected, and his participation in next week's Champions League match is uncertain. Teammates and coaching staff are supporting him to receive the best treatment for a quick recovery.",
                "source": "L'Équipe",
                "team": "PSG",
                "league": "ligue1",
                "likes": 89,
                "comments": 23,
                "shares": 12,
                "date": "2025-08-12",
                "tags": [
                    {"type": "player", "name": "Lee Kang-in", "image": "/placeholder.svg?height=24&width=24"},
                    {"type": "team", "name": "PSG", "image": "/images/logo-psg.png"}
                ]
            },
            {
                "time": "12:08",
                "title": "Kim Min-jae wears Bayern Munich captain's armband",
                "content": "Kim Min-jae led the team wearing the captain's armband in today's match. Due to Neuer's injury, Kim Min-jae took on the temporary captaincy and contributed to the team's victory with decisive defense in the second half. German media highly praised Kim Min-jae's leadership and stable defensive skills.",
                "source": "Bild",
                "team": "Bayern Munich",
                "league": "bundesliga",
                "likes": 156,
                "comments": 45,
                "shares": 28,
                "date": "2025-08-12",
                "tags": [
                    {"type": "player", "name": "Kim Min-jae", "image": "/placeholder.svg?height=24&width=24"},
                    {"type": "team", "name": "Bayern Munich", "image": "/images/logo-bayern-munich.png"}
                ]
            },
            {
                "time": "11:45",
                "title": "Fabrizio Romano: Brighton's Caicedo, Manchester United transfer imminent",
                "content": "Fabrizio Romano reported that Brighton's midfielder Moises Caicedo's transfer to Manchester United is imminent. Here we go! Manchester United offered 100 million euros in transfer fee, and the player has already agreed to personal terms. Medical tests are scheduled to take place this week, and official announcement is expected within 48 hours.",
                "source": "Fabrizio Romano",
                "team": "Manchester United",
                "league": "premier",
                "likes": 312,
                "comments": 89,
                "shares": 67,
                "date": "2025-08-12",
                "tags": [
                    {"type": "player", "name": "Caicedo", "image": "/placeholder.svg?height=24&width=24"},
                    {"type": "team", "name": "Brighton", "image": "/placeholder.svg?height=24&width=24"},
                    {"type": "team", "name": "Manchester United", "image": "/images/logo-man-utd.png"}
                ]
            },
            {
                "time": "10:30",
                "title": "Son Heung-min, Tottenham contract renewal negotiations begin",
                "content": "British media reported that Son Heung-min and Tottenham Hotspur have officially begun contract renewal negotiations. Son Heung-min, whose current contract runs until 2026, is showing a positive stance about his future at Tottenham, and the club is known to want a long-term contract with him as a key player. A weekly wage of 300,000 pounds has been proposed.",
                "source": "Sky Sports",
                "team": "Tottenham",
                "league": "premier",
                "likes": 234,
                "comments": 67,
                "shares": 45,
                "date": "2025-08-12",
                "tags": [
                    {"type": "player", "name": "Son Heung-min", "image": "/placeholder.svg?height=24&width=24"},
                    {"type": "team", "name": "Tottenham", "image": "/images/logo-tottenham.png"}
                ]
            },
            {
                "time": "18:30",
                "title": "Hwang Hee-chan scores first goal after Wolverhampton transfer",
                "content": "Hwang Hee-chan scored a goal in his first official match after transferring to Wolverhampton. Hwang Hee-chan, who scored a header in the 25th minute of the first half from a corner kick situation, received enthusiastic cheers from fans. In a post-match interview, Hwang Heung-chan expressed his joy about his first goal with the new team and promised to do his best for the team in the future.",
                "source": "BBC Sport",
                "team": "Wolverhampton",
                "league": "premier",
                "likes": 178,
                "comments": 34,
                "shares": 22,
                "date": "2025-08-11",
                "tags": [
                    {"type": "player", "name": "Hwang Hee-chan", "image": "/placeholder.svg?height=24&width=24"},
                    {"type": "team", "name": "Wolverhampton", "image": "/images/logo-wolves.png"}
                ]
            },
            {
                "time": "16:45",
                "title": "Fabrizio Romano: Mbappe's Real Madrid transfer completed",
                "content": "Fabrizio Romano confirmed that Kylian Mbappe's transfer to Real Madrid has been completed. Here we go confirmed! Mbappe, who will transfer on a free contract after his contract with PSG expires, has signed a 5-year contract with an annual salary of 25 million euros after tax. Official announcement is scheduled to take place after Euro 2024 ends.",
                "source": "Fabrizio Romano",
                "team": "Real Madrid",
                "league": "laliga",
                "likes": 456,
                "comments": 123,
                "shares": 89,
                "date": "2025-08-11",
                "tags": [
                    {"type": "player", "name": "Mbappe", "image": "/placeholder.svg?height=24&width=24"},
                    {"type": "team", "name": "Real Madrid", "image": "/images/logo-real-madrid.png"}
                ]
            }
        ]
        
        for news_item in news_data:
            db_news = News(**news_item)
            db.add(db_news)
        
        # 커뮤니티 포스트 데이터 삽입 (main.tsx의 모든 데이터)
        print("Inserting community posts data...")
        community_data = [
            {
                "category": "Football",
                "title": "What do you think about Son Heung-min's form this season?",
                "content": "Personally, I think he's much better than last season, especially his goal-scoring ability has improved a lot. He's also playing a key role at Tottenham...",
                "author": "FootballFan123",
                "time": "2 minutes ago",
                "replies": 45,
                "likes": 23,
                "is_hot": True,
                "is_bookmarked": False
            },
            {
                "category": "Baseball",
                "title": "Congratulations on Ryu Hyun-jin's 10th win!",
                "content": "It's really an amazing record. He's the pride of Korean baseball. I think he's worth expecting to win the Cy Young Award this season.",
                "author": "BaseballLover",
                "time": "15 minutes ago",
                "replies": 67,
                "likes": 89,
                "is_hot": False,
                "is_bookmarked": True
            },
            {
                "category": "Football",
                "title": "So sad to hear about Lee Kang-in's injury",
                "content": "He was showing good form at PSG... I hope he recovers quickly and shows good games again.",
                "author": "Parisian",
                "time": "32 minutes ago",
                "replies": 28,
                "likes": 56,
                "is_hot": False,
                "is_bookmarked": False
            },
            {
                "category": "Prediction",
                "title": "Predict this weekend's EPL matches!",
                "content": "The Manchester United vs Liverpool match is the most anticipated, what do you think? I think Manchester United will win 2-1.",
                "author": "PredictionKing",
                "time": "1 hour ago",
                "replies": 134,
                "likes": 78,
                "is_hot": True,
                "is_bookmarked": False
            },
            {
                "category": "Basketball",
                "title": "NBA new season MVP prediction",
                "content": "Personally, I think Luka Doncic will win MVP this year, what do you think?",
                "author": "BasketballMania",
                "time": "2시간 전",
                "replies": 92,
                "likes": 45,
                "is_hot": False,
                "is_bookmarked": True
            }
        ]
        
        for post_item in community_data:
            db_post = CommunityPost(**post_item)
            db.add(db_post)
        
        # 리그 순위 데이터 삽입 (main.tsx의 모든 데이터)
        print("Inserting league standings data...")
        standings_data = [
            # 프리미어리그
            {
                "league": "premier",
                "rank": 1,
                "team": "Liverpool",
                "played": 3,
                "won": 3,
                "drawn": 0,
                "lost": 0,
                "goals_for": 8,
                "goals_against": 4,
                "goal_diff": 4,
                "points": 9,
                "form": ["W", "W", "W"]
            },
            {
                "league": "premier",
                "rank": 2,
                "team": "Chelsea",
                "played": 3,
                "won": 2,
                "drawn": 1,
                "lost": 0,
                "goals_for": 7,
                "goals_against": 1,
                "goal_diff": 6,
                "points": 7,
                "form": ["D", "W", "W"]
            },
            {
                "league": "premier",
                "rank": 3,
                "team": "Arsenal",
                "played": 3,
                "won": 2,
                "drawn": 0,
                "lost": 1,
                "goals_for": 6,
                "goals_against": 1,
                "goal_diff": 5,
                "points": 6,
                "form": ["W", "W", "L"]
            },
            {
                "league": "premier",
                "rank": 4,
                "team": "Tottenham",
                "played": 3,
                "won": 2,
                "drawn": 0,
                "lost": 1,
                "goals_for": 5,
                "goals_against": 1,
                "goal_diff": 4,
                "points": 6,
                "form": ["W", "W", "L"]
            },
            {
                "league": "premier",
                "rank": 5,
                "team": "Everton",
                "played": 3,
                "won": 2,
                "drawn": 0,
                "lost": 1,
                "goals_for": 5,
                "goals_against": 3,
                "goal_diff": 2,
                "points": 6,
                "form": ["L", "W", "W"]
            },
            # La Liga
            {
                "league": "laliga",
                "rank": 1,
                "team": "Real Madrid",
                "played": 3,
                "won": 3,
                "drawn": 0,
                "lost": 0,
                "goals_for": 9,
                "goals_against": 2,
                "goal_diff": 7,
                "points": 9,
                "form": ["W", "W", "W"]
            },
            {
                "league": "laliga",
                "rank": 2,
                "team": "Barcelona",
                "played": 3,
                "won": 2,
                "drawn": 1,
                "lost": 0,
                "goals_for": 7,
                "goals_against": 3,
                "goal_diff": 4,
                "points": 7,
                "form": ["D", "W", "W"]
            },
            {
                "league": "laliga",
                "rank": 3,
                "team": "Atletico Madrid",
                "played": 3,
                "won": 2,
                "drawn": 0,
                "lost": 1,
                "goals_for": 5,
                "goals_against": 2,
                "goal_diff": 3,
                "points": 6,
                "form": ["W", "W", "L"]
            },
            # Bundesliga
            {
                "league": "bundesliga",
                "rank": 1,
                "team": "Bayern Munich",
                "played": 3,
                "won": 3,
                "drawn": 0,
                "lost": 0,
                "goals_for": 10,
                "goals_against": 2,
                "goal_diff": 8,
                "points": 9,
                "form": ["W", "W", "W"]
            },
            {
                "league": "bundesliga",
                "rank": 2,
                "team": "Borussia Dortmund",
                "played": 3,
                "won": 2,
                "drawn": 1,
                "lost": 0,
                "goals_for": 6,
                "goals_against": 2,
                "goal_diff": 4,
                "points": 7,
                "form": ["D", "W", "W"]
            },
            {
                "league": "bundesliga",
                "rank": 3,
                "team": "라이프치히",
                "played": 3,
                "won": 2,
                "drawn": 0,
                "lost": 1,
                "goals_for": 5,
                "goals_against": 3,
                "goal_diff": 2,
                "points": 6,
                "form": ["승", "승", "패"]
            },
            # 세리에A
            {
                "league": "seriea",
                "rank": 1,
                "team": "인터밀란",
                "played": 3,
                "won": 3,
                "drawn": 0,
                "lost": 0,
                "goals_for": 8,
                "goals_against": 1,
                "goal_diff": 7,
                "points": 9,
                "form": ["승", "승", "승"]
            },
            {
                "league": "seriea",
                "rank": 2,
                "team": "유벤투스",
                "played": 3,
                "won": 2,
                "drawn": 1,
                "lost": 0,
                "goals_for": 6,
                "goals_against": 2,
                "goal_diff": 4,
                "points": 7,
                "form": ["무", "승", "승"]
            },
            # 리그1
            {
                "league": "ligue1",
                "rank": 1,
                "team": "PSG",
                "played": 3,
                "won": 3,
                "drawn": 0,
                "lost": 0,
                "goals_for": 9,
                "goals_against": 1,
                "goal_diff": 8,
                "points": 9,
                "form": ["승", "승", "승"]
            },
            {
                "league": "ligue1",
                "rank": 2,
                "team": "마르세유",
                "played": 3,
                "won": 2,
                "drawn": 1,
                "lost": 0,
                "goals_for": 6,
                "goals_against": 2,
                "goal_diff": 4,
                "points": 7,
                "form": ["무", "승", "승"]
            }
        ]
        
        for standing_item in standings_data:
            db_standing = LeagueStanding(**standing_item)
            db.add(db_standing)
        
        # 사용자 데이터 삽입
        print("Inserting user data...")
        from app.core.security import get_password_hash
        
        # Admin 사용자 생성
        admin_user = User(
            username="admin",
            email="admin@sports.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Administrator",
            is_active=True,
            is_superuser=True,
            is_admin=True
        )
        db.add(admin_user)
        
        # 일반 사용자 생성
        normal_user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=get_password_hash("testpass123"),
            full_name="Test User",
            is_active=True,
            is_superuser=False,
            is_admin=False
        )
        db.add(normal_user)
        
        # 하드코딩된 예측 이벤트들 추가
        print("Inserting hardcoded prediction events...")
        from datetime import datetime, timedelta
        
        hardcoded_predictions = [
            {
                "game_id": "MANCITY_ARSENAL_001",
                "prediction": "Manchester City will beat Arsenal 2-1",
                "option_a": "Manchester City Win",
                "option_b": "Arsenal Win",
                "duration": 48,
                "status": "approved"
            },
            {
                "game_id": "MBAPPE_REAL_002", 
                "prediction": "Kylian Mbappe will transfer to Real Madrid in summer 2025",
                "option_a": "Will Transfer",
                "option_b": "Will Not Transfer",
                "duration": 72,
                "status": "approved"
            },
            {
                "game_id": "SON_TOTTENHAM_003",
                "prediction": "Son Heung-min will stay at Tottenham for 2025-26 season",
                "option_a": "Will Stay",
                "option_b": "Will Leave",
                "duration": 96,
                "status": "approved"
            },
            {
                "game_id": "CHELSEA_CL_004",
                "prediction": "Chelsea will qualify for Champions League in 2024-25 season",
                "option_a": "Will Qualify",
                "option_b": "Will Not Qualify",
                "duration": 120,
                "status": "approved"
            },
            {
                "game_id": "LIVERPOOL_PL_005",
                "prediction": "Liverpool will win Premier League in 2024-25 season",
                "option_a": "Will Win",
                "option_b": "Will Not Win",
                "duration": 144,
                "status": "approved"
            },
            {
                "game_id": "PEP_MANCITY_006",
                "prediction": "Pep Guardiola will extend contract with Manchester City in 2025",
                "option_a": "Will Extend",
                "option_b": "Will Leave",
                "duration": 168,
                "status": "approved"
            },
            {
                "game_id": "BARCELONA_LALIGA_007",
                "prediction": "Barcelona will win La Liga in 2024-25 season",
                "option_a": "Will Win",
                "option_b": "Will Not Win",
                "duration": 192,
                "status": "approved"
            },
            {
                "game_id": "JUVENTUS_SERIE_008",
                "prediction": "Juventus will finish in top 4 of Serie A in 2024-25 season",
                "option_a": "Top 4 Finish",
                "option_b": "Outside Top 4",
                "duration": 216,
                "status": "approved"
            },
            # 추가 더미 데이터 (스코어링되지 않은 상태)
            {
                "game_id": "HAALAND_PSG_009",
                "prediction": "Erling Haaland will transfer to PSG in 2025",
                "option_a": "Will Transfer",
                "option_b": "Will Stay at Manchester City",
                "duration": 240,
                "status": "pending"
            },
            {
                "game_id": "REALMADRID_CL_010",
                "prediction": "Real Madrid will win Champions League in 2024-25 season",
                "option_a": "Will Win Champions League",
                "option_b": "Will Not Win Champions League",
                "duration": 360,
                "status": "pending"
            },
            {
                "game_id": "NEYMAR_BARCELONA_011",
                "prediction": "Neymar will return to Barcelona in 2025",
                "option_a": "Will Return to Barcelona",
                "option_b": "Will Stay at Al-Hilal",
                "duration": 180,
                "status": "pending"
            },
            {
                "game_id": "DEBRUYNE_INJURY_012",
                "prediction": "Kevin De Bruyne will return from injury within 2 months",
                "option_a": "Will Return within 2 months",
                "option_b": "Will Return after 2 months",
                "duration": 120,
                "status": "pending"
            },
            {
                "game_id": "MANUTD_TOP6_013",
                "prediction": "Manchester United will finish in top 6 of Premier League",
                "option_a": "Will Finish in Top 6",
                "option_b": "Will Finish Outside Top 6",
                "duration": 200,
                "status": "pending"
            },
            {
                "game_id": "LEWANDOWSKI_TOPSCORER_014",
                "prediction": "Robert Lewandowski will be Bundesliga top scorer",
                "option_a": "Will Be Top Scorer",
                "option_b": "Will Not Be Top Scorer",
                "duration": 240,
                "status": "pending"
            },
            {
                "game_id": "SALAH_20GOALS_015",
                "prediction": "Mohamed Salah will score 20+ goals this season",
                "option_a": "Will Score 20+ Goals",
                "option_b": "Will Score Less than 20 Goals",
                "duration": 180,
                "status": "pending"
            },
            {
                "game_id": "VINICIUS_BALLONDOR_016",
                "prediction": "Vinícius Júnior will be nominated for Ballon d'Or",
                "option_a": "Will Be Nominated",
                "option_b": "Will Not Be Nominated",
                "duration": 300,
                "status": "pending"
            }
        ]
        
        for pred_data in hardcoded_predictions:
            expires_at = datetime.utcnow() + timedelta(hours=pred_data["duration"])
            prediction = PredictionEvent(
                game_id=pred_data["game_id"],
                prediction=pred_data["prediction"],
                option_a=pred_data["option_a"],
                option_b=pred_data["option_b"],
                duration=pred_data["duration"],
                creator_id=1,  # admin_user.id 대신 직접 1 사용
                status=pred_data["status"],
                expires_at=expires_at,
                total_bets=0,
                total_amount=0
            )
            db.add(prediction)
        
        db.commit()
        print("Sample data inserted successfully!")
        
    except Exception as e:
        print(f"Error inserting sample data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """메인 함수"""
    print("Starting database initialization...")
    init_database()
    insert_sample_data()
    print("Database initialization completed!")

if __name__ == "__main__":
    main()
