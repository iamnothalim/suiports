import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { newsApi } from '../utils/api'
import { News, NewsListResponse } from '../types'

// 뉴스 목록 조회
export const useNews = (page = 1, size = 20, league?: string, team?: string) => {
  return useQuery<NewsListResponse>({
    queryKey: ['news', page, size, league, team],
    queryFn: () => newsApi.getNews(page, size, league, team),
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// 특정 뉴스 조회
export const useNewsById = (id: number) => {
  return useQuery<News>({
    queryKey: ['news', id],
    queryFn: () => newsApi.getNewsById(id),
    enabled: !!id,
  })
}

// 뉴스 생성
export const useCreateNews = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (newsData: any) => newsApi.createNews(newsData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
    },
  })
}

// 뉴스 일괄 생성
export const useCreateNewsBulk = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (newsList: any[]) => newsApi.createNewsBulk(newsList),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
    },
  })
}
