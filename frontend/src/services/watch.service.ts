import api from '@/lib/axios'

export const watchService = {
  getIssueWatchStatus(issueId: string): Promise<{ watching: boolean }> {
    return api.get(`/issues/${issueId}/watch/`).then(r => r.data)
  },
  watchIssue(issueId: string): Promise<{ watching: boolean }> {
    return api.post(`/issues/${issueId}/watch/`).then(r => r.data)
  },
  unwatchIssue(issueId: string): Promise<{ watching: boolean }> {
    return api.delete(`/issues/${issueId}/watch/`).then(r => r.data)
  },

  getPageWatchStatus(pageId: string): Promise<{ watching: boolean }> {
    return api.get(`/wiki/pages/${pageId}/watch/`).then(r => r.data)
  },
  watchPage(pageId: string): Promise<{ watching: boolean }> {
    return api.post(`/wiki/pages/${pageId}/watch/`).then(r => r.data)
  },
  unwatchPage(pageId: string): Promise<{ watching: boolean }> {
    return api.delete(`/wiki/pages/${pageId}/watch/`).then(r => r.data)
  },
}
