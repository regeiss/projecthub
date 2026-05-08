import { useQuery } from '@tanstack/react-query'
import { activityService } from '@/services/activity.service'

export function useProjectActivity(projectId: string) {
  return useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: () => activityService.getProjectActivity(projectId),
    enabled: !!projectId,
    refetchInterval: 60_000,
  })
}
