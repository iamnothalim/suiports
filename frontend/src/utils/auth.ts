import axios from 'axios'
import { User, UserCreate, Token } from '../types'

const API_BASE_URL = 'http://localhost:8000/api/v1'

// 토큰을 localStorage에서 가져오는 함수
export const getToken = (): string | null => {
  return localStorage.getItem('access_token')
}

// 토큰을 localStorage에 저장하는 함수
export const setToken = (token: string): void => {
  localStorage.setItem('access_token', token)
}

// 토큰을 localStorage에서 제거하는 함수
export const removeToken = (): void => {
  localStorage.removeItem('access_token')
}

// Axios 인스턴스 생성 (인증 헤더 포함)
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터 - 토큰 자동 추가
authApi.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 - 401 에러 처리
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 회원가입
export const register = async (userData: UserCreate): Promise<User> => {
  const response = await authApi.post('/auth/register', userData)
  return response.data
}

// 로그인
export const login = async (username: string, password: string): Promise<Token> => {
  const formData = new FormData()
  formData.append('username', username)
  formData.append('password', password)
  
  const response = await authApi.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  return response.data
}

// 현재 사용자 정보 조회
export const getCurrentUser = async (): Promise<User> => {
  const response = await authApi.get('/auth/me')
  return response.data
}

// 로그아웃
export const logout = async (): Promise<void> => {
  await authApi.post('/auth/logout')
  removeToken()
}
