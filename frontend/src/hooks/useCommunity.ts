import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communityApi } from '../utils/api'
import { CommunityPost, CommunityPostListResponse } from '../types'

// 커뮤니티 포스트 목록 조회
export const useCommunityPosts = (page = 1, size = 20, category?: string, isHot?: boolean) => {
  return useQuery<CommunityPostListResponse>({
    queryKey: ['community', page, size, category, isHot],
    queryFn: () => communityApi.getPosts(page, size, category, isHot),
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// 특정 포스트 조회
export const useCommunityPostById = (id: number) => {
  return useQuery<CommunityPost>({
    queryKey: ['community', id],
    queryFn: () => communityApi.getPostById(id),
    enabled: !!id,
  })
}

// 포스트 생성
export const useCreateCommunityPost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (postData: any) => communityApi.createPost(postData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] })
    },
  })
}

// 포스트 일괄 생성
export const useCreateCommunityPostsBulk = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (posts: any[]) => communityApi.createPostsBulk(posts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] })
    },
  })
}
