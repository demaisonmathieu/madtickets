const DEFAULT_API_BASE_URL = 'http://localhost:4000/api'

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let message = `API error (${response.status})`
    try {
      const body = await response.json()
      message = body.error || message
    } catch {
      // ignore non-json error bodies
    }
    throw new Error(message)
  }

  if (response.status === 204) return null
  return response.json()
}
