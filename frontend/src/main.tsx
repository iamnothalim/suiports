"use client"

import React, { useState } from "react"
import {
  Heart,
  MessageCircle,
  Zap,
  BarChart3,
  Video,
  MessageSquare,
  Share,
  ChevronLeft,
  ChevronRight,
  X,
  Target,
  Settings,
} from "lucide-react"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNews } from "./hooks/useNews"
import { useCommunityPosts } from "./hooks/useCommunity"
import { useAllStandings } from "./hooks/useStandings"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import LoginModal from "./components/LoginModal"
import CreatePredictionModal from "./components/CreatePredictionModal"
import './index.css'

const queryClient = new QueryClient()

const navItems = [
  { id: "breaking", label: "Breaking News", icon: Zap },
  { id: "stats", label: "Statistics", icon: BarChart3 },
  { id: "videos", label: "Videos", icon: Video },
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "prediction", label: "Prediction Game", icon: Target },
  { id: "admin", label: "Admin", icon: Settings },
]


const leagues = [
  { id: "premier", name: "Premier League" },
  { id: "laliga", name: "La Liga" },
  { id: "bundesliga", name: "Bundesliga" },
  { id: "seriea", name: "Serie A" },
  { id: "ligue1", name: "Ligue 1" },
]

const getRandomColor = (name: string) => {
  const colors = [
    { name: "bg-red-500", bgColor: "bg-red-500" },
    { name: "bg-blue-500", bgColor: "bg-blue-500" },
    { name: "bg-green-500", bgColor: "bg-green-500" },
    { name: "bg-yellow-500", bgColor: "bg-yellow-500" },
    { name: "bg-purple-500", bgColor: "bg-purple-500" },
    { name: "bg-pink-500", bgColor: "bg-pink-500" },
    { name: "bg-indigo-500", bgColor: "bg-indigo-500" },
    { name: "bg-teal-500", bgColor: "bg-teal-500" },
    { name: "bg-orange-500", bgColor: "bg-orange-500" },
    { name: "bg-cyan-500", bgColor: "bg-cyan-500" },
  ]
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

export default function SportsNewsApp() {
  const [activeTab, setActiveTab] = useState("breaking")
  const [selectedLeague, setSelectedLeague] = useState("premier")
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCreatePredictionModal, setShowCreatePredictionModal] = useState(false)
  const [bettingCard, setBettingCard] = useState(null)
  const [betAmount, setBetAmount] = useState(10)
  const [selectedOption, setSelectedOption] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)

  const [stickyDate, setStickyDate] = useState("2025-08-12")
  const [statsTab, setStatsTab] = useState("team")
  const [predictions, setPredictions] = useState<any[]>([])
  const [predictionScores, setPredictionScores] = useState<any[]>([])

  // 인증 상태
  const { user, logout } = useAuth()
  const isLoggedIn = !!user

  // 예측 이벤트 로드 함수 (백엔드 API 사용)
  const loadPredictions = async () => {
    try {
      const token = localStorage.getItem('access_token')
      
      // Admin인 경우 모든 예측, 일반 사용자인 경우 승인된 예측만 로드
      const endpoint = user?.is_admin ? 
        'http://localhost:8000/api/v1/predictions/' : 
        'http://localhost:8000/api/v1/predictions/approved'
      
      const headers: any = {
        'Content-Type': 'application/json'
      }
      
      // Admin인 경우에만 토큰 필요
      if (user?.is_admin && token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(endpoint, { headers })
      
      if (response.ok) {
        const data = await response.json()
        setPredictions(data)
        console.log('백엔드에서 예측 이벤트 로드 성공:', data)
      } else {
        console.error('예측 이벤트 로드 실패:', response.status)
        setPredictions([])
      }
    } catch (error) {
      console.error('예측 이벤트 로드 오류:', error)
      setPredictions([])
    }
  }

  // 예측 이벤트 생성 함수
  const handleCreatePrediction = async (predictionData: any) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Login required.')
        return
      }

      const response = await fetch('http://localhost:8000/api/v1/predictions/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(predictionData)
      })
      
      if (response.ok) {
        const newPrediction = await response.json()
        setPredictions(prev => [...prev, newPrediction])
        alert('예측 이벤트가 성공적으로 생성되었습니다! Admin 승인 후 예측 게임 탭에 표시됩니다.')
      } else {
        const errorData = await response.json()
        console.error('예측 이벤트 생성 실패:', errorData)
        alert(`예측 이벤트 생성에 실패했습니다: ${errorData.detail || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('예측 이벤트 생성 오류:', error)
      alert('예측 이벤트 생성에 실패했습니다.')
    }
  }

  // AI 점수 계산 함수
  // 기존 AI 점수들을 불러오는 함수
  const loadExistingScores = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      // 모든 예측 이벤트에 대해 점수 확인
      const scores = []
      for (const prediction of predictions) {
        try {
          const response = await fetch(`http://localhost:8000/api/v1/scoring/${prediction.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const score = await response.json()
            scores.push(score)
          } else if (response.status === 404) {
            // 점수가 없는 예측은 무시
            console.log(`점수가 없는 예측 ID: ${prediction.id}`)
          } else {
            console.error(`점수 조회 실패 - 예측 ID: ${prediction.id}, 상태: ${response.status}`)
          }
        } catch (error) {
          // 개별 점수 조회 오류는 무시하고 계속 진행
          console.log(`점수 조회 오류 - 예측 ID: ${prediction.id}:`, error)
        }
      }
      
      setPredictionScores(scores)
      console.log(`총 ${scores.length}개의 AI 점수를 로드했습니다.`)
    } catch (error) {
      console.error('기존 점수 불러오기 오류:', error)
    }
  }

  const calculateAIScore = async (predictionId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Login required.')
        return
      }

      const response = await fetch(`http://localhost:8000/api/v1/scoring/calculate/${predictionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const score = await response.json()
        setPredictionScores(prev => [...prev, score])
        alert('AI 점수 계산이 완료되었습니다!')
      } else {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        alert(`AI 점수 계산에 실패했습니다: ${errorData.detail || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('AI 점수 계산 오류:', error)
      alert('AI 점수 계산 중 오류가 발생했습니다.')
    }
  }

  // Load prediction events when login status changes
  React.useEffect(() => {
    if (isLoggedIn) {
      loadPredictions()
      // Admin인 경우에만 점수 로드
      if (user?.is_admin) {
        loadExistingScores()
      }
    } else {
      // 로그인하지 않은 경우에도 승인된 예측은 볼 수 있도록
      loadPredictions()
    }
  }, [isLoggedIn, user?.is_admin])

  // 예측 이벤트가 로드된 후 기존 점수들 불러오기
  React.useEffect(() => {
    if (predictions.length > 0 && isLoggedIn && user?.is_admin) {
      loadExistingScores()
    }
  }, [predictions, isLoggedIn, user?.is_admin])

  // API 호출
  const { data: newsData, isLoading: newsLoading, error: newsError } = useNews(1, 50)
  const { data: communityData, isLoading: communityLoading, error: communityError } = useCommunityPosts(1, 50)
  const { data: standingsData, isLoading: standingsLoading, error: standingsError } = useAllStandings()

  // API 오류 로깅
  React.useEffect(() => {
    if (newsError) {
      console.error('News API Error:', newsError)
    }
    if (standingsError) {
      console.error('Standings API Error:', standingsError)
    }
    if (communityError) {
      console.error('Community API Error:', communityError)
    }
  }, [newsError, standingsError, communityError])


  // API 데이터를 기존 형식으로 변환
  const breakingNews = newsData?.news || []
  const communityPosts = communityData?.posts || []
  const leagueStandings = standingsData?.reduce((acc, leagueData) => {
    acc[leagueData.league] = leagueData.standings
    return acc
  }, {} as Record<string, any[]>) || {}

  const groupNewsByDate = (news: typeof breakingNews) => {
    return news.reduce(
      (groups, item) => {
        const date = item.date
        if (!groups[date]) {
          groups[date] = []
        }
        groups[date].push(item)
        return groups
      },
      {} as Record<string, typeof breakingNews>,
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const dayBeforeYesterday = new Date(today)
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)

    if (dateString === today.toISOString().split("T")[0]) {
      return "오늘, 2025년 8월 12일 화요일"
    } else if (dateString === yesterday.toISOString().split("T")[0]) {
      return "어제, 2025년 8월 11일 월요일"
    } else if (dateString === dayBeforeYesterday.toISOString().split("T")[0]) {
      return "그제, 2025년 8월 10일 일요일"
    } else {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }
      return date.toLocaleDateString("ko-KR", options)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "축구":
        return "⚽"
      case "야구":
        return "⚾"
      case "농구":
        return "🏀"
      case "예측":
        return "🎯"
      default:
        return "💬"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "축구":
        return "text-green-600 bg-green-50"
      case "야구":
        return "text-blue-600 bg-blue-50"
      case "농구":
        return "text-orange-600 bg-orange-50"
      case "예측":
        return "text-purple-600 bg-purple-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const handleLogin = (email, password) => {
    // Simple login simulation
    if (email && password) {
      const userData = {
        name: email.split("@")[0],
        email: email,
        avatar: email.charAt(0).toUpperCase(),
      }
      setUser(userData)
      setIsLoggedIn(true)
      setShowLoginModal(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
  }

  const handleBetClick = (gameId, option) => {
    setBettingCard(gameId)
    setSelectedOption(option)
    setBetAmount(10)
  }

  const handleBetSubmit = () => {
    // 베팅 로직 처리
    console.log(`베팅: ${selectedOption.name}, 금액: $${betAmount}`)
    setBettingCard(null)
    setSelectedOption(null)
  }

  const handlePostClick = (post) => {
    setSelectedPost(post)
  }

  const handleBackToCommunity = () => {
    setSelectedPost(null)
  }

  const renderStatsContent = () => {
    const standings = leagueStandings[selectedLeague as keyof typeof leagueStandings] || []

    return (
      <div className="pb-20 w-full">
        {/* 리그 선택 탭 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 w-full">
          <div className="flex gap-2 overflow-x-auto">
            {leagues.map((league) => (
              <button
                key={league.id}
                onClick={() => setSelectedLeague(league.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedLeague === league.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {league.name}
              </button>
            ))}
          </div>
        </div>

        {/* 시즌 정보 */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChevronLeft className="w-5 h-5 text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900">2025-26</h2>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            <button className="text-sm text-gray-500 flex items-center gap-1">
              순위 안내 <span className="text-xs">ⓘ</span>
            </button>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-white px-6 border-b border-gray-200 w-full">
          <div className="flex gap-8">
            <button
              onClick={() => setStatsTab("team")}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                statsTab === "team"
                  ? "text-blue-500 border-blue-500"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              팀 순위
            </button>
            <button
              onClick={() => setStatsTab("record")}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                statsTab === "record"
                  ? "text-blue-500 border-blue-500"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Team Stats
            </button>
            <button
              onClick={() => setStatsTab("player")}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                statsTab === "player"
                  ? "text-blue-500 border-blue-500"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Player Stats
            </button>
          </div>
        </div>

        {/* 순위표 */}
        <div className="bg-white w-full">
          <div className="px-6 py-4 w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              팀 순위 <span className="text-xs text-gray-500">ⓘ</span>
            </h3>
          </div>

          {/* 테이블 헤더 */}
          <div className="px-6 py-3 bg-gray-50 border-y border-gray-200 w-full">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600">
              <div className="col-span-1 text-gray-600">순위</div>
              <div className="col-span-3 text-gray-600">팀명</div>
              <div className="col-span-1 text-center text-gray-600">승점</div>
              <div className="col-span-1 text-center text-gray-600">경기</div>
              <div className="col-span-1 text-center text-gray-600">승</div>
              <div className="col-span-1 text-center text-gray-600">무</div>
              <div className="col-span-1 text-center text-gray-600">패</div>
              <div className="col-span-1 text-center text-gray-600">득점</div>
              <div className="col-span-1 text-center text-gray-600">실점</div>
              <div className="col-span-1 text-center text-gray-600">득실</div>
            </div>
          </div>

          {/* 순위 목록 */}
          <div className="divide-y divide-gray-100 w-full">
            {standings.map((team) => (
              <div key={team.rank} className="px-6 py-4 hover:bg-gray-50 transition-colors w-full">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1 h-8 rounded-full ${
                          team.rank <= 4
                            ? "bg-blue-500"
                            : team.rank <= 6
                              ? "bg-green-500"
                              : team.rank >= standings.length - 2
                                ? "bg-red-500"
                                : "bg-transparent"
                        }`}
                      ></div>
                      <span className="font-medium text-gray-900">{team.rank}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full ${getRandomColor(team.team).bgColor}`}></div>
                      <span className="font-medium text-gray-900">{team.team}</span>
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="font-bold text-blue-600">{team.points}</span>
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">{team.played}</div>
                  <div className="col-span-1 text-center text-sm text-gray-600">{team.won}</div>
                  <div className="col-span-1 text-center text-sm text-gray-600">{team.drawn}</div>
                  <div className="col-span-1 text-center text-sm text-gray-600">{team.lost}</div>
                  <div className="col-span-1 text-center text-sm text-gray-600">{team.goalsFor}</div>
                  <div className="col-span-1 text-center text-sm text-gray-600">{team.goalsAgainst}</div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    <span className={team.goalDiff >= 0 ? "text-green-600" : "text-red-600"}>
                      {team.goalDiff >= 0 ? "+" : ""}
                      {team.goalDiff}
                    </span>
                  </div>
                </div>

                {/* 최근 경기 결과 */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">최근 5경기:</span>
                  <div className="flex gap-1">
                    {team.form.map((result, index) => (
                      <div
                        key={index}
                        className={`w-6 h-6 rounded text-xs font-medium flex items-center justify-center ${
                          result === "승"
                            ? "bg-green-100 text-green-600"
                            : result === "무"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-red-100 text-red-600"
                        }`}
                      >
                        {result === "승" ? "승" : result === "무" ? "무" : "패"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderAdminContent = () => {
    if (!isLoggedIn || !user?.is_admin) {
      return (
        <div className="pb-20 relative w-full">
          <div className="bg-white border-b border-gray-200 p-6 w-full">
            <div className="text-center py-12">
              <Settings size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
              <p className="text-gray-600">This page is only accessible to administrators.</p>
            </div>
          </div>
        </div>
      )
    }

    const pendingPredictions = predictions.filter(p => p.status === 'pending')
    const approvedPredictions = predictions.filter(p => p.status === 'approved')

    const handleApprovePrediction = async (predictionId: string) => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          alert('Login required.')
          return
        }

        const response = await fetch(`http://localhost:8000/api/v1/predictions/${predictionId}/approve`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'approved' })
        })
        
        if (response.ok) {
          const updatedPrediction = await response.json()
          setPredictions(prev => prev.map(p => 
            p.id === predictionId ? updatedPrediction : p
          ))
          alert('예측 이벤트가 승인되었습니다!')
        } else {
          const errorData = await response.json()
          console.error('예측 이벤트 승인 실패:', errorData)
          alert(`예측 이벤트 승인에 실패했습니다: ${errorData.detail || '알 수 없는 오류'}`)
        }
      } catch (error) {
        console.error('예측 이벤트 승인 오류:', error)
        alert('예측 이벤트 승인 중 오류가 발생했습니다.')
      }
    }

    const handleRejectPrediction = async (predictionId: string) => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          alert('Login required.')
          return
        }

        const response = await fetch(`http://localhost:8000/api/v1/predictions/${predictionId}/approve`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'rejected' })
        })
        
        if (response.ok) {
          const updatedPrediction = await response.json()
          setPredictions(prev => prev.map(p => 
            p.id === predictionId ? updatedPrediction : p
          ))
          alert('예측 이벤트가 거부되었습니다!')
        } else {
          const errorData = await response.json()
          console.error('예측 이벤트 거부 실패:', errorData)
          alert(`예측 이벤트 거부에 실패했습니다: ${errorData.detail || '알 수 없는 오류'}`)
        }
      } catch (error) {
        console.error('예측 이벤트 거부 오류:', error)
        alert('예측 이벤트 거부 중 오류가 발생했습니다.')
      }
    }

    return (
      <div className="pb-20 relative w-full">
        <div className="bg-white border-b border-gray-200 p-6 w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">🔧 Admin Panel</h1>
          
          {/* 대기 중인 예측 이벤트 */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">⏳ Pending Prediction Events</h2>
            {pendingPredictions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No pending prediction events.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPredictions.map((prediction: any) => (
                  <div key={prediction.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                          {prediction.game_id}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {prediction.creator}
                        </span>
                        <span className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded text-xs font-medium">
                          대기중
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(prediction.createdAt).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-900 mb-3">{prediction.prediction}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-700 mb-1">옵션 A</div>
                        <div className="text-gray-900">{prediction.option_a}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-700 mb-1">옵션 B</div>
                        <div className="text-gray-900">{prediction.option_b}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* AI 점수 표시 */}
                      {(() => {
                        const score = predictionScores.find(s => s.prediction_id === parseInt(prediction.id))
                        if (score) {
                          const getScoreColor = (score: number) => {
                            if (score >= 80) return 'text-green-600 bg-green-100'
                            if (score >= 60) return 'text-yellow-600 bg-yellow-100'
                            if (score >= 40) return 'text-orange-600 bg-orange-100'
                            return 'text-red-600 bg-red-100'
                          }
                          
                          const getTotalScoreColor = (score: number) => {
                            if (score >= 80) return 'text-green-700 bg-green-200'
                            if (score >= 60) return 'text-yellow-700 bg-yellow-200'
                            if (score >= 40) return 'text-orange-700 bg-orange-200'
                            return 'text-red-700 bg-red-200'
                          }

                          return (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                  🤖 AI 평가 점수
                                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                    완료
                                  </span>
                                </h4>
                                <div className={`px-3 py-1 rounded-full font-bold text-lg ${getTotalScoreColor(score.total_score)}`}>
                                  {score.total_score}점
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-5 gap-2 mb-3">
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">품질 (35%)</div>
                                  <div className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(score.quality_score)}`}>
                                    {score.quality_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">수요 (25%)</div>
                                  <div className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(score.demand_score)}`}>
                                    {score.demand_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">신뢰 (20%)</div>
                                  <div className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(score.reputation_score)}`}>
                                    {score.reputation_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">선점 (10%)</div>
                                  <div className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(score.novelty_score)}`}>
                                    {score.novelty_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">경제 (10%)</div>
                                  <div className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(score.economic_score)}`}>
                                    {score.economic_score}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-white p-3 rounded border text-xs text-gray-700">
                                <div className="font-medium text-gray-800 mb-1">📊 AI 분석 결과:</div>
                                <div className="leading-relaxed">
                                  {score.ai_reasoning}
                                </div>
                              </div>
                              
                              <button 
                                onClick={() => calculateAIScore(prediction.id)}
                                className="w-full mt-2 bg-blue-500 text-white py-1 px-3 rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                              >
                                🔄 점수 재계산
                              </button>
                            </div>
                          )
                        } else {
                          return (
                            <button 
                              onClick={() => calculateAIScore(prediction.id)}
                              className="w-full bg-blue-500 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                            >
                              🤖 AI 점수 계산
                            </button>
                          )
                        }
                      })()}
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApprovePrediction(prediction.id)}
                          className="flex-1 bg-green-500 text-white py-2 px-4 rounded text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          ✅ 승인
                        </button>
                        <button 
                          onClick={() => handleRejectPrediction(prediction.id)}
                          className="flex-1 bg-red-500 text-white py-2 px-4 rounded text-sm font-medium hover:bg-red-600 transition-colors"
                        >
                          ❌ 거부
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 승인된 예측 이벤트 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">✅ Approved Prediction Events</h2>
            {approvedPredictions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No approved prediction events.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedPredictions.map((prediction: any) => (
                  <div key={prediction.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                          {prediction.game_id}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {prediction.creator}
                        </span>
                        <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-medium">
                          승인됨
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(prediction.createdAt).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-900 mb-3">{prediction.prediction}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-700 mb-1">옵션 A</div>
                        <div className="text-gray-900">{prediction.option_a}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-700 mb-1">옵션 B</div>
                        <div className="text-gray-900">{prediction.option_b}</div>
                      </div>
                    </div>
                    
                    {/* 승인된 예측에도 AI 점수 표시 */}
                    {(() => {
                      const score = predictionScores.find(s => s.prediction_id === parseInt(prediction.id))
                      if (score) {
                        const getScoreColor = (score: number) => {
                          if (score >= 80) return 'text-green-600 bg-green-100'
                          if (score >= 60) return 'text-yellow-600 bg-yellow-100'
                          if (score >= 40) return 'text-orange-600 bg-orange-100'
                          return 'text-red-600 bg-red-100'
                        }
                        
                        const getTotalScoreColor = (score: number) => {
                          if (score >= 80) return 'text-green-700 bg-green-200'
                          if (score >= 60) return 'text-yellow-700 bg-yellow-200'
                          if (score >= 40) return 'text-orange-700 bg-orange-200'
                          return 'text-red-700 bg-red-200'
                        }

                        return (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-green-900 flex items-center gap-2">
                                🤖 AI 평가 점수
                                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                  완료
                                </span>
                              </h4>
                              <div className={`px-2 py-1 rounded-full font-bold text-sm ${getTotalScoreColor(score.total_score)}`}>
                                {score.total_score}점
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-1 mb-2">
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-600 mb-1">품질</div>
                                <div className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(score.quality_score)}`}>
                                  {score.quality_score}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-600 mb-1">수요</div>
                                <div className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(score.demand_score)}`}>
                                  {score.demand_score}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-600 mb-1">신뢰</div>
                                <div className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(score.reputation_score)}`}>
                                  {score.reputation_score}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-600 mb-1">선점</div>
                                <div className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(score.novelty_score)}`}>
                                  {score.novelty_score}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-600 mb-1">경제</div>
                                <div className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(score.economic_score)}`}>
                                  {score.economic_score}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderPredictionContent = () => {
    // 승인된 예측 이벤트들을 백엔드에서 로드
    const approvedPredictions = predictions.filter(p => p.status === 'approved')
    
    return (
      <div className="pb-20 relative w-full">
        <div className="bg-white border-b border-gray-200 p-4 w-full">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">🎯 예측 게임</h2>
            {isLoggedIn ? (
              <button 
                onClick={() => setShowCreatePredictionModal(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all"
              >
                🎯 AI Prediction Modeling
              </button>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                title="Login required"
              >
                🔒 Login to Create Prediction
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-6">
          {/* 승인된 예측 이벤트들 */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🔥 Active Prediction Events</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedPredictions.map((prediction: any) => {
                const timeLeft = Math.ceil((new Date(prediction.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))
                const isExpired = timeLeft <= 0
                
                return (
                  <div key={prediction.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                          {prediction.game_id}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          isExpired ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {isExpired ? 'Expired' : 'Active'}
                        </span>
                      </div>
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 text-sm mb-2">{prediction.prediction}</h4>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>⏰ {isExpired ? 'Expired' : `${timeLeft}h left`}</span>
                      <span>💰 Total Bets: ${prediction.total_amount}</span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{prediction.option_a}</span>
                        <span className="font-semibold text-green-600">45%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{prediction.option_b}</span>
                        <span className="font-semibold text-red-600">55%</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 bg-green-500 text-white py-2 px-3 rounded text-sm font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        disabled={isExpired || !isLoggedIn}
                        onClick={() => {
                          if (!isLoggedIn) {
                            setShowLoginModal(true)
                          } else {
                            // 베팅 로직 구현
                            alert(`${prediction.option_a}에 베팅하시겠습니까?`)
                          }
                        }}
                      >
                        ✅ {prediction.option_a}
                      </button>
                      <button 
                        className="flex-1 bg-red-500 text-white py-2 px-3 rounded text-sm font-medium hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        disabled={isExpired || !isLoggedIn}
                        onClick={() => {
                          if (!isLoggedIn) {
                            setShowLoginModal(true)
                          } else {
                            // 베팅 로직 구현
                            alert(`${prediction.option_b}에 베팅하시겠습니까?`)
                          }
                        }}
                      >
                        ❌ {prediction.option_b}
                      </button>
                    </div>
                  </div>
                )
              })}
              
              {approvedPredictions.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">🎯</div>
                  <p className="text-lg font-medium mb-2">No approved prediction events yet</p>
                  <p className="text-sm">Approved predictions will appear here!</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    )
  }

  const renderBreakingContent = () => {
    const groupedNews = groupNewsByDate(breakingNews)
    const sortedDates = Object.keys(groupedNews).sort((a, b) => b.localeCompare(a))

    return (
      <div className="pb-20 w-full">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 w-full">
          <span className="text-sm font-medium text-gray-600">{formatDate(stickyDate)}</span>
        </div>

        <div className="relative bg-white w-full">
          <div className="absolute left-20 top-0 bottom-0 w-px bg-gray-200"></div>

          {sortedDates.map((date) => (
            <div key={date} className="relative">
              <div className="space-y-0">
                {groupedNews[date].map((news) => {
                  const isImportant = news.likes >= 200
                  return (
                    <div
                      key={news.id}
                      className="relative flex hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-20 flex-shrink-0 py-4 px-4 text-right">
                        <div
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isImportant ? "bg-[#00C28C] text-white" : "bg-gray-100 text-[#00C28C]"
                          }`}
                        >
                          {news.time}
                        </div>
                      </div>

                      <div className="absolute left-20 transform -translate-x-1/2 mt-6">
                        <div
                          className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                            isImportant ? "bg-[#00C28C]" : "bg-gray-400"
                          }`}
                        ></div>
                      </div>

                      <div className="flex-1 py-4 pr-6 pl-8">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 font-normal">{news.source}</span>
                          </div>

                          <h3
                            className={`text-lg font-semibold leading-tight ${
                              isImportant ? "text-[#00C28C]" : "text-gray-900"
                            }`}
                          >
                            {news.title}
                          </h3>

                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{news.content}</p>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {news.tags?.map((tag, tagIndex) => (
                              <div
                                key={tagIndex}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full text-xs font-medium text-gray-700 h-8"
                              >
                                <div
                                  className={`w-5 h-5 rounded-full flex-shrink-0 ${getRandomColor(tag.name).bgColor}`}
                                ></div>
                                <span className="whitespace-nowrap">{tag.name}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-6 text-xs text-gray-500 pt-2">
                            <div className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              <span>{news.likes}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              <span>{news.comments}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Share className="w-4 h-4" />
                              <span>{news.shares}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderCommunityContent = () => {
    if (selectedPost) {
      return (
        <div className="pb-20 relative bg-white w-full">
          {/* Header with back button */}
          <div className="border-b border-gray-200 p-4 w-full">
            <button
              onClick={handleBackToCommunity}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <span>←</span>
              <span className="text-sm">Back to Community</span>
            </button>
          </div>

          {/* Post content */}
          <div className="p-6">
            {/* Author info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                {selectedPost.avatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{selectedPost.author}</span>
                  <span className="text-gray-500 text-sm">• {selectedPost.time}</span>
                  {selectedPost.badge && (
                    <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">
                      {selectedPost.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Post title and content */}
            <h1 className="text-xl font-bold text-gray-900 mb-4">{selectedPost.title}</h1>
            {selectedPost.content && (
              <div className="text-gray-700 mb-6 whitespace-pre-line leading-relaxed">{selectedPost.content}</div>
            )}

            {/* Post actions */}
            <div className="flex items-center gap-6 py-4 border-b border-gray-200">
              <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
                <span>❤️</span>
                <span>{selectedPost.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                <span>💬</span>
                <span>{selectedPost.comments}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
                <span>📤</span>
                <span>공유</span>
              </button>
            </div>
          </div>

          {/* Comments section */}
          <div className="px-6 pb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">댓글 {selectedPost.comments}개</h3>

            {/* Comment input */}
            <div className="mb-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">👤</div>
                <div className="flex-1">
                  <textarea
                    placeholder="댓글을 남겨보세요"
                    className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#00C28C] focus:border-transparent"
                    rows="3"
                  />
                  <div className="flex justify-end mt-2">
                    <button className="bg-[#00C28C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00B87A] transition-colors">
                      댓글 작성
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments list */}
            <div className="space-y-4">
              {[
                {
                  author: "축구광팬",
                  time: "2시간 전",
                  content: "정말 좋은 분석이네요! 저도 비슷하게 생각하고 있었습니다.",
                  likes: 5,
                  avatar: "⚽",
                },
                {
                  author: "프리미어매니아",
                  time: "4시간 전",
                  content: "손흥민 폼이 정말 좋아 보이긴 하는데, 아스날도 만만치 않을 것 같아요.",
                  likes: 3,
                  avatar: "🏆",
                },
                {
                  author: "토트넘러버",
                  time: "6시간 전",
                  content: "이번 시즌 토트넘 기대됩니다! COYS!",
                  likes: 8,
                  avatar: "🐓",
                },
              ].map((comment, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                    {comment.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">{comment.author}</span>
                      <span className="text-gray-500 text-xs">• {comment.time}</span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">{comment.content}</p>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors">
                        <span>❤️</span>
                        <span>{comment.likes}</span>
                      </button>
                      <button className="text-xs text-gray-500 hover:text-blue-500 transition-colors">답글</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="pb-20 relative w-full">
        <div className="bg-white border-b border-gray-200 p-6 w-full">
          <h2 className="text-lg font-bold mb-4 text-gray-900">🔥 실시간 인기글</h2>
          <div className="space-y-3">
            {[
              { title: "손흥민 골든부트 가능성은?", author: "축구매니아", time: "2시간 전", likes: 156 },
              { title: "이강인 PSG 적응기 어떻게 보시나요", author: "파리지앵", time: "4시간 전", likes: 89 },
              { title: "김민재 바이에른 이적 후 근황", author: "분데스리가팬", time: "6시간 전", likes: 67 },
            ].map((post, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-[#00C28C] font-bold text-sm">{index + 1}</span>
                  <span className="text-gray-900 text-sm font-medium">{post.title}</span>
                  <span className="text-gray-500 text-xs">• {post.author}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>❤️ {post.likes}</span>
                  <span>{post.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white w-full">
          {[
            {
              id: 1,
              author: "손흥민팬",
              time: "7시간 전",
              badge: "수정됨",
              title: "토트넘 vs 아스날 더비 예상",
              content:
                "이번 노스런던 더비 어떻게 보시나요?\n\n손흥민 컨디션도 좋고 케인 없어도 충분히 이길 수 있을 것 같은데",
              likes: 15,
              comments: 8,
              avatar: "⚽",
            },
            {
              id: 2,
              author: "맨유매니아",
              time: "3일 전",
              title: "텐하흐 감독 전술 변화... 이번 시즌 기대됩니다",
              likes: 23,
              comments: 12,
              avatar: "🔴",
            },
            {
              id: 3,
              author: "리버풀러버",
              time: "20시간 전",
              title: "살라 재계약 소식 언제 나올까요?",
              content: "계속 미뤄지고 있는데 걱정이네요",
              likes: 31,
              comments: 5,
              avatar: "🔴",
            },
            {
              id: 4,
              author: "첼시팬",
              time: "1일 전",
              title: "포체티노 감독 체제 어떻게 생각하세요?",
              content: "아직 적응 기간이겠지만 기대가 큽니다",
              likes: 18,
              comments: 15,
              avatar: "🔵",
            },
            {
              id: 5,
              author: "시티즌",
              time: "2일 전",
              title: "홀란드 득점 기록 경신 가능할까요?",
              likes: 42,
              comments: 7,
              avatar: "💙",
            },
          ].map((post) => (
            <div
              key={post.id}
              className="border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => handlePostClick(post)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                  {post.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">{post.author}</span>
                    <span className="text-gray-500 text-xs">• {post.time}</span>
                    {post.badge && (
                      <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">
                        {post.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 text-sm">{post.title}</h3>
                  {post.content && <p className="text-gray-600 text-sm mb-3 whitespace-pre-line">{post.content}</p>}
                  <div className="flex items-center gap-4 text-gray-500">
                    <button className="flex items-center gap-1 text-xs hover:text-gray-700">
                      <span>❤️</span>
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1 text-xs hover:text-gray-700">
                      <span>💬</span>
                      <span>{post.comments}</span>
                    </button>
                    <button className="text-xs hover:text-gray-700">
                      <span>📤</span>
                    </button>
                  </div>
                </div>
                <button className="text-blue-500 text-sm font-medium hover:text-blue-600 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors">
                  팔로우
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "breaking":
        return renderBreakingContent()
      case "stats":
        return renderStatsContent()
      case "community":
        return renderCommunityContent()
      case "prediction":
        return renderPredictionContent()
      case "admin":
        return renderAdminContent()
      default:
        return renderBreakingContent()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 w-full">
        <div className="w-full max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#00C28C] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">스</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">스플</h1>
              </div>
            </div>

            <nav className="flex items-center gap-8">
              <button
                onClick={() => setActiveTab("breaking")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "breaking"
                    ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Breaking News
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "stats"
                    ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Statistics
              </button>
              <button
                onClick={() => setActiveTab("community")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "community"
                    ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Community
              </button>
              <button
                onClick={() => setActiveTab("prediction")}
                className={`text-sm font-medium transition-colors relative ${
                  activeTab === "prediction"
                    ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                예측 게임
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold my-[-10px] mx-[-6px]">
                  HOT
                </span>
              </button>
              {isLoggedIn && user?.is_admin && (
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`text-sm font-medium transition-colors ${
                    activeTab === "admin"
                      ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>

            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-8 h-8 rounded-full bg-[#00C28C] flex items-center justify-center text-white text-sm font-medium">
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-sm font-medium">{user?.username || "사용자"}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-[#00C28C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00B87A] transition-colors"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showLoginModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96 max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#00C28C] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">스</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">SPL Sign Up/Login</h2>
              <p className="text-gray-600 text-sm">SPL is a space to enjoy sports breaking news and prediction games.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                handleLogin(formData.get("email"), formData.get("password"))
              }}
              className="space-y-4"
            >
              <input
                name="email"
                type="email"
                placeholder="이메일 주소"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C28C]"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="비밀번호"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C28C]"
                required
              />
              <button
                type="submit"
                className="w-full bg-[#00C28C] text-white py-3 rounded-lg font-medium hover:bg-[#00A876] transition-colors"
              >
                로그인
              </button>
            </form>

            <div className="mt-6 space-y-3">
              <button className="w-full bg-yellow-400 text-black py-3 rounded-lg font-medium hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2">
                <span>💬</span>
                카카오 계정으로 계속하기
              </button>
              <button className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <span>G</span>
                구글 계정으로 계속하기
              </button>
            </div>

            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <main className="w-full max-w-6xl mx-auto">{renderContent()}</main>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: none;
        }
      `}</style>
      
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
      
      {/* 예측 이벤트 생성 모달 */}
      <CreatePredictionModal 
        isOpen={showCreatePredictionModal} 
        onClose={() => setShowCreatePredictionModal(false)}
        onSubmit={handleCreatePrediction}
      />
    </div>
  )
}

// ReactDOM 렌더링
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SportsNewsApp />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
