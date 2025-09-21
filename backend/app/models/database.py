from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

# SQLite 데이터베이스 설정
SQLALCHEMY_DATABASE_URL = "sqlite:///./sui_ports.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 뉴스 모델
class News(Base):
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True, index=True)
    time = Column(String(10), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String(100), nullable=False)
    team = Column(String(100), nullable=False)
    league = Column(String(50), nullable=False)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    date = Column(String(20), nullable=False)
    tags = Column(JSON)  # JSON 형태로 태그 저장
    created_at = Column(DateTime, default=datetime.utcnow)

# 커뮤니티 포스트 모델
class CommunityPost(Base):
    __tablename__ = "community_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text)
    author = Column(String(100), nullable=False)
    time = Column(String(50), nullable=False)
    replies = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    is_hot = Column(Boolean, default=False)
    is_bookmarked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# 리그 순위 모델
class LeagueStanding(Base):
    __tablename__ = "league_standings"
    
    id = Column(Integer, primary_key=True, index=True)
    league = Column(String(50), nullable=False)
    rank = Column(Integer, nullable=False)
    team = Column(String(100), nullable=False)
    played = Column(Integer, default=0)
    won = Column(Integer, default=0)
    drawn = Column(Integer, default=0)
    lost = Column(Integer, default=0)
    goals_for = Column(Integer, default=0)
    goals_against = Column(Integer, default=0)
    goal_diff = Column(Integer, default=0)
    points = Column(Integer, default=0)
    form = Column(JSON)  # JSON 형태로 최근 경기 결과 저장
    created_at = Column(DateTime, default=datetime.utcnow)

# 사용자 모델
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)  # Admin 구분 필드 추가
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 예측 이벤트 모델
class PredictionEvent(Base):
    __tablename__ = "prediction_events"
    
    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(String(100), nullable=False)
    prediction = Column(Text, nullable=False)
    option_a = Column(String(200), nullable=False)  # 2지선다 옵션 A
    option_b = Column(String(200), nullable=False)  # 2지선다 옵션 B
    duration = Column(Integer, nullable=False)  # 베팅 기간 (시간)
    deadline = Column(String(50), nullable=True)  # 마감 날짜
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending, approved, rejected, active, expired
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    total_bets = Column(Integer, default=0)
    total_amount = Column(Integer, default=0)
    user_address = Column(String(100), nullable=True)  # 지갑 주소
    pool_id = Column(String(100), nullable=True)  # Sui 컨트랙트 Pool ID

# 예측 점수 모델
class PredictionScore(Base):
    __tablename__ = "prediction_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("prediction_events.id"), nullable=False)
    quality_score = Column(Float, nullable=False)  # 품질/해결 가능성 (35%)
    demand_score = Column(Float, nullable=False)   # 수요/트렌드 신호 (25%)
    reputation_score = Column(Float, nullable=False)  # 제안자 신뢰/기여 (20%)
    novelty_score = Column(Float, nullable=False)  # 선점/중복도 (10%)
    economic_score = Column(Float, nullable=False)  # 경제성/운영성 (10%)
    total_score = Column(Float, nullable=False)    # 총점
    quality_details = Column(JSON)  # 품질 세부 점수
    demand_details = Column(JSON)   # 수요 세부 점수
    reputation_details = Column(JSON)  # 신뢰 세부 점수
    novelty_details = Column(JSON)  # 선점 세부 점수
    economic_details = Column(JSON)  # 경제성 세부 점수
    ai_reasoning = Column(Text)     # AI 추론 과정
    created_at = Column(DateTime, default=datetime.utcnow)

# 베팅 모델
class Bet(Base):
    __tablename__ = "bets"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("prediction_events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_address = Column(String(100), nullable=False)  # 지갑 주소
    option = Column(String(200), nullable=False)  # 베팅한 옵션 (option_a 또는 option_b)
    amount = Column(Float, nullable=False)  # 베팅 금액 (USDC)
    transaction_hash = Column(String(100), nullable=True)  # Sui 트랜잭션 해시
    pool_id = Column(String(100), nullable=True)  # Sui Pool ID
    created_at = Column(DateTime, default=datetime.utcnow)

# 데이터베이스 테이블 생성
def create_tables():
    Base.metadata.create_all(bind=engine)

# 데이터베이스 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
