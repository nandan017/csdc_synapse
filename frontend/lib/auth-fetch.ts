import { createClient } from './supabase'

/**
 * Drop-in replacement for fetch() that automatically includes
 * the Supabase JWT in the Authorization header.
 * Use this for any authenticated API calls from client components.
 */
export async function authFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Merge any custom headers
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => { headers[k] = v })
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([k, v]) => { headers[k] = v })
    } else {
      Object.assign(headers, init.headers)
    }
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  return fetch(url, { ...init, headers })
}
