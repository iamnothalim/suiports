import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 뉴스 API
export const newsApi = {
  // 뉴스 목록 조회
  getNews: async (page = 1, size = 20, league?: string, team?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    })
    
    if (league) params.append('league', league)
    if (team) params.append('team', team)
    
    const response = await api.get(`/news/?${params}`)
    return response.data
  },

  // 특정 뉴스 조회
  getNewsById: async (id: number) => {
    const response = await api.get(`/news/${id}`)
    return response.data
  },

  // 뉴스 생성
  createNews: async (newsData: any) => {
    const response = await api.post('/news/', newsData)
    return response.data
  },

  // 뉴스 일괄 생성
  createNewsBulk: async (newsList: any[]) => {
    const response = await api.post('/news/bulk', newsList)
    return response.data
  },
}

// 커뮤니티 API
export const communityApi = {
  // 커뮤니티 포스트 목록 조회
  getPosts: async (page = 1, size = 20, category?: string, isHot?: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    })
    
    if (category) params.append('category', category)
    if (isHot !== undefined) params.append('is_hot', isHot.toString())
    
    const response = await api.get(`/community/?${params}`)
    return response.data
  },

  // 특정 포스트 조회
  getPostById: async (id: number) => {
    const response = await api.get(`/community/${id}`)
    return response.data
  },

  // 포스트 생성
  createPost: async (postData: any) => {
    const response = await api.post('/community/', postData)
    return response.data
  },

  // 포스트 일괄 생성
  createPostsBulk: async (posts: any[]) => {
    const response = await api.post('/community/bulk', posts)
    return response.data
  },
}

// 순위표 API
export const standingsApi = {
  // 모든 리그 순위 조회
  getAllStandings: async () => {
    const response = await api.get('/standings/')
    return response.data
  },

  // 특정 리그 순위 조회
  getStandingsByLeague: async (league: string) => {
    const response = await api.get(`/standings/${league}`)
    return response.data
  },

  // 순위 생성
  createStanding: async (standingData: any) => {
    const response = await api.post('/standings/', standingData)
    return response.data
  },

  // 순위 일괄 생성
  createStandingsBulk: async (standings: any[]) => {
    const response = await api.post('/standings/bulk', standings)
    return response.data
  },
}

// 헬스체크 API
export const healthApi = {
  check: async () => {
    const response = await api.get('/health/')
    return response.data
  },
}

export default api
