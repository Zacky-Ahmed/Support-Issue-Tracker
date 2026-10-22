const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export async function getHealth(signal) {
  const response = await fetch(API_URL + '/health', { signal })
  if (!response.ok) throw new Error('API request failed: ' + response.status)
  const data = await response.json()
  if (data.status !== 'ok') throw new Error('Unexpected health response')
  return data
}
