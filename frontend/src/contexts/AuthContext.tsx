import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, UserCreate, AuthContextType } from '../types'
import { login as loginApi, register as registerApi, getCurrentUser, logout as logoutApi, getToken, setToken, removeToken } from '../utils/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 컴포넌트 마운트 시 토큰 확인 및 사용자 정보 로드
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getToken()
      if (storedToken) {
        setTokenState(storedToken)
        try {
          const userData = await getCurrentUser()
          setUser(userData)
        } catch (error) {
          console.error('Failed to get current user:', error)
          removeToken()
          setTokenState(null)
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const tokenData = await loginApi(username, password)
      setToken(tokenData.access_token)
      setTokenState(tokenData.access_token)
      
      const userData = await getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const register = async (userData: UserCreate): Promise<void> => {
    try {
      await registerApi(userData)
      // 회원가입 후 자동 로그인
      await login(userData.username, userData.password)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await logoutApi()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      removeToken()
      setTokenState(null)
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
