const DEFAULT_API_BASE_URL = 'http://localhost:4000/api'

type ApiFetchOptions = RequestInit & {
  timeoutMs?: number
}

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { timeoutMs, signal, ...requestOptions } = options
  const controller = new AbortController()
  const timeout = timeoutMs
    ? setTimeout(() => controller.abort(new Error('Timeout de la requête API')), timeoutMs)
    : null

  let response: Response
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(requestOptions.headers || {}),
      },
      ...requestOptions,
      signal: signal || controller.signal,
    })
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('La requête API a expiré. Vérifiez la configuration et réessayez.')
    }
    throw error
  } finally {
    if (timeout) clearTimeout(timeout)
  }

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
