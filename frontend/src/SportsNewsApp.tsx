"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { useNews } from "./hooks/useNews"
import { useCommunityPosts } from "./hooks/useCommunity"
import { useAllStandings } from "./hooks/useStandings"
import { News, CommunityPost, LeagueStandingsResponse } from "./types"

// 샘플 데이터를 시간순으로 더 많이 추가
const breakingNews = [
  {
    id: 1,
    time: "12:15",
    title: "이강인, PSG 훈련 중 부상으로 조기 복귀",
    content:
      "이강인이 오늘 PSG 훈련 중 발목 부상을 당해 조기 복귀했습니다. 의료진은 2-3주간의 회복 기간이 필요할 것으로 예상한다고 발표했으며, 다음 주 챔피언스리그 경기 출전은 불투명한 상황입니다. 팀 동료들과 코칭스태프는 빠른 회복을 위해 최선의 치료를 받을 수 있도록 지원하고 있다고 전했습니다.",
    source: "L'Équipe",
    team: "PSG",
    league: "ligue1",
    likes: 89,
    comments: 23,
    shares: 12,
    date: "2025-08-12",
    tags: [
      { type: "player", name: "이강인", image: "/placeholder.svg?height=24&width=24" },
      { type: "team", name: "PSG", image: "/images/logo-psg.png" },
    ],
  },
  {
    id: 2,
    time: "12:08",
    title: "김민재, 바이에른 뮌헨 주장 완장 착용",
    content:
      "김민재가 오늘 경기에서 주장 완장을 착용하며 팀을 이끌었습니다. 노이어의 부상으로 인해 임시 주장직을 맡게 된 김민재는 후반전에서 결정적인 수비를 보여주며 팀의 승리에 기여했습니다. 독일 언론들은 김민재의 리더십과 안정적인 수비력을 높이 평가하고 있습니다.",
    source: "Bild",
    team: "바이에른뮌헨",
    league: "bundesliga",
    likes: 156,
    comments: 45,
    shares: 28,
    date: "2025-08-12",
    tags: [
      { type: "player", name: "김민재", image: "/placeholder.svg?height=24&width=24" },
      { type: "team", name: "바이에른뮌헨", image: "/images/logo-bayern-munich.png" },
    ],
  },
]

const communityPosts = [
  {
    id: 1,
    category: "축구",
    title: "손흥민 이번 시즌 폼 어떻게 생각하세요?",
    content:
      "개인적으로 지난 시즌보다 훨씬 좋아진 것 같은데, 특히 골 결정력이 많이 향상된 것 같아요. 토트넘에서도 핵심 역할을 하고 있고...",
    author: "축구팬123",
    time: "2분 전",
    replies: 45,
    likes: 23,
    isHot: true,
    isBookmarked: false,
  },
  {
    id: 2,
    category: "야구",
    title: "류현진 10승 축하합니다!",
    content: "정말 대단한 기록이네요. 한국 야구의 자랑입니다. 이번 시즌 사이영상도 기대해볼 만할 것 같아요.",
    author: "야구러버",
    time: "15분 전",
    replies: 67,
    likes: 89,
    isHot: false,
    isBookmarked: true,
  },
]

const navItems = [
  { id: "breaking", label: "속보", icon: Zap },
  { id: "stats", label: "기록", icon: BarChart3 },
  { id: "videos", label: "영상", icon: Video },
  { id: "community", label: "커뮤니티", icon: MessageSquare },
]

const leagueStandings = {
  premier: [
    {
      rank: 1,
      team: "리버풀",
      played: 3,
      won: 3,
      drawn: 0,
      lost: 0,
      goalsFor: 8,
      goalsAgainst: 4,
      goalDiff: 4,
      points: 9,
      form: ["승", "승", "승"],
    },
    {
      rank: 2,
      team: "첼시",
      played: 3,
      won: 2,
      drawn: 1,
      lost: 0,
      goalsFor: 7,
      goalsAgainst: 1,
      goalDiff: 6,
      points: 7,
      form: ["무", "승", "승"],
    },
  ],
}

const leagues = [
  { id: "premier", name: "프리미어리그" },
  { id: "laliga", name: "라리가" },
  { id: "bundesliga", name: "분데스리가" },
  { id: "seriea", name: "세리에A" },
  { id: "ligue1", name: "리그1" },
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
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [user, setUser] = useState(null)
  const [bettingCard, setBettingCard] = useState(null)
  const [betAmount, setBetAmount] = useState(10)
  const [selectedOption, setSelectedOption] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)

  const [stickyDate, setStickyDate] = useState("2025-08-12")
  const [statsTab, setStatsTab] = useState("team")

  // API 호출
  const { data: newsData, isLoading: newsLoading, error: newsError } = useNews(1, 50)
  const { data: communityData, isLoading: communityLoading, error: communityError } = useCommunityPosts(1, 50)
  const { data: standingsData, isLoading: standingsLoading, error: standingsError } = useAllStandings()

  // API 데이터를 기존 형식으로 변환 (API 실패시 하드코딩된 데이터 사용)
  const news = newsData?.news || breakingNews
  const posts = communityData?.posts || communityPosts
  const standings = standingsData?.reduce((acc, leagueData) => {
    acc[leagueData.league] = leagueData.standings
    return acc
  }, {} as Record<string, any[]>) || leagueStandings

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

  const handleLogin = (email, password) => {
    // 간단한 로그인 시뮬레이션
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

  const renderBreakingContent = () => {
    if (newsLoading) {
      return (
        <div className="pb-20 flex items-center justify-center h-64">
          <div className="text-gray-500">뉴스를 불러오는 중...</div>
        </div>
      )
    }

    if (newsError) {
      return (
        <div className="pb-20 flex items-center justify-center h-64">
          <div className="text-red-500">뉴스를 불러오는데 실패했습니다.</div>
        </div>
      )
    }

    const groupedNews = groupNewsByDate(news)
    const sortedDates = Object.keys(groupedNews).sort((a, b) => b.localeCompare(a))

    return (
      <div className="pb-20">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <span className="text-sm font-medium text-gray-600">{formatDate(stickyDate)}</span>
        </div>

        <div className="relative bg-white">
          <div className="absolute left-20 top-0 bottom-0 w-px bg-gray-200"></div>

          {sortedDates.map((date) => (
            <div key={date} className="relative">
              <div className="space-y-0">
                {groupedNews[date].map((newsItem) => {
                  const isImportant = newsItem.likes >= 200
                  return (
                    <div
                      key={newsItem.id}
                      className="relative flex hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-20 flex-shrink-0 py-4 px-4 text-right">
                        <div
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isImportant ? "bg-[#00C28C] text-white" : "bg-gray-100 text-[#00C28C]"
                          }`}
                        >
                          {newsItem.time}
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
                            <span className="text-xs text-gray-500 font-normal">{newsItem.source}</span>
                          </div>

                          <h3
                            className={`text-lg font-semibold leading-tight ${
                              isImportant ? "text-[#00C28C]" : "text-gray-900"
                            }`}
                          >
                            {newsItem.title}
                          </h3>

                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{newsItem.content}</p>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {newsItem.tags?.map((tag, tagIndex) => (
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
                              <span>{newsItem.likes}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              <span>{newsItem.comments}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Share className="w-4 h-4" />
                              <span>{newsItem.shares}</span>
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

  const renderContent = () => {
    switch (activeTab) {
      case "breaking":
        return renderBreakingContent()
      default:
        return renderBreakingContent()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3">
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
                속보
              </button>
            </nav>

            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#00C28C] flex items-center justify-center text-white text-sm font-medium">
                      {user?.name?.charAt(0) || "U"}
                    </div>
                    <span className="text-sm font-medium">{user?.name || "사용자"}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-[#00C28C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00B87A] transition-colors"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">{renderContent()}</main>
    </div>
  )
}
