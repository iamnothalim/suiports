import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { standingsApi } from '../utils/api'
import { LeagueStanding, LeagueStandingsResponse } from '../types'

// 모든 리그 순위 조회
export const useAllStandings = () => {
  return useQuery<LeagueStandingsResponse[]>({
    queryKey: ['standings'],
    queryFn: () => standingsApi.getAllStandings(),
    staleTime: 10 * 60 * 1000, // 10분
  })
}

// 특정 리그 순위 조회
export const useStandingsByLeague = (league: string) => {
  return useQuery<LeagueStandingsResponse>({
    queryKey: ['standings', league],
    queryFn: () => standingsApi.getStandingsByLeague(league),
    enabled: !!league,
    staleTime: 10 * 60 * 1000, // 10분
  })
}

// 순위 생성
export const useCreateStanding = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (standingData: any) => standingsApi.createStanding(standingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] })
    },
  })
}

// 순위 일괄 생성
export const useCreateStandingsBulk = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (standings: any[]) => standingsApi.createStandingsBulk(standings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] })
    },
  })
}
