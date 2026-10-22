const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
async function request(path, options = {}) {
  let response
  try { response = await fetch(API_URL + path, options) }
  catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Cannot reach the server. Check your connection and try again.')
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(data?.message || 'The request failed. Please try again.')
    error.fields = data?.errors || {}
    throw error
  }
  if (!data) throw new Error('Unexpected server response. Please try again.')
  return data
}
export const getHealth = signal => request('/health', { signal })
export const getIssues = signal => request('/issues', { signal })
export const saveIssue = (id, body) => request('/issues' + (id ? '/' + id : ''), {
  method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
export const deleteIssue = id => request('/issues/' + id, { method: 'DELETE' })
