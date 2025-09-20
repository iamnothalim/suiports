// 뉴스 관련 타입
export interface Tag {
  type: string
  name: string
  image: string
}

export interface News {
  id: number
  time: string
  title: string
  content: string
  source: string
  team: string
  league: string
  likes: number
  comments: number
  shares: number
  date: string
  tags: Tag[]
  created_at: string
}

export interface NewsListResponse {
  news: News[]
  total: number
  page: number
  size: number
}

// 커뮤니티 포스트 관련 타입
export interface CommunityPost {
  id: number
  category: string
  title: string
  content?: string
  author: string
  time: string
  replies: number
  likes: number
  is_hot: boolean
  is_bookmarked: boolean
  created_at: string
}

export interface CommunityPostListResponse {
  posts: CommunityPost[]
  total: number
  page: number
  size: number
}

// 리그 순위 관련 타입
export interface LeagueStanding {
  id: number
  league: string
  rank: number
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
  form: string[]
  created_at: string
}

export interface LeagueStandingsResponse {
  league: string
  standings: LeagueStanding[]
}

// 인증 관련 타입
export interface User {
  id: number
  username: string
  email: string
  full_name?: string
  is_active: boolean
  is_superuser: boolean
  is_admin: boolean
  created_at: string
}

export interface UserCreate {
  username: string
  email: string
  password: string
  full_name?: string
}

export interface UserLogin {
  username: string
  password: string
}

export interface Token {
  access_token: string
  token_type: string
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (userData: UserCreate) => Promise<void>
  logout: () => void
  isLoading: boolean
}

// 예측 이벤트 관련 타입
export interface PredictionEvent {
  id: number
  game_id: string
  prediction: string
  option_a: string
  option_b: string
  duration: number
  creator_id: number
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'expired'
  created_at: string
  expires_at?: string
  total_bets: number
  total_amount: number
}

export interface PredictionEventCreate {
  game_id: string
  prediction: string
  option_a: string
  option_b: string
  duration: number
}

export interface Bet {
  id: string
  predictionId: string
  userId: string
  amount: number
  side: 'yes' | 'no'
  createdAt: string
}

// AI 점수 관련 타입
export interface PredictionScore {
  id: number
  prediction_id: number
  quality_score: number
  demand_score: number
  reputation_score: number
  novelty_score: number
  economic_score: number
  total_score: number
  quality_details: {
    clarity: number
    data_source: number
    timeframe: number
    compliance: number
  }
  demand_details: {
    trend_indicators: number
    topic_popularity: number
    timing: number
  }
  reputation_details: {
    loyalty: number
    success_history: number
    bond_size: number
  }
  novelty_details: {
    first_mover: number
    uniqueness: number
  }
  economic_details: {
    liquidity: number
    volatility: number
    oracle_cost: number
  }
  ai_reasoning: string
  created_at: string
}

// API 응답 타입
export interface ApiResponse<T> {
  data: T
  message?: string
  status: number
}
