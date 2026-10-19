'use client'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  })
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  if (!res.ok) {
    const msg = (body as { error?: string })?.error || `خطای ${res.status}`
    throw new ApiError(res.status, msg)
  }
  return body as T
}

export const apiGet = <T>(url: string): Promise<T> => request<T>(url)
export const apiPost = <T>(url: string, data?: unknown): Promise<T> =>
  request<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined })
export const apiPatch = <T>(url: string, data: unknown): Promise<T> =>
  request<T>(url, { method: 'PATCH', body: JSON.stringify(data) })
export const apiDelete = <T>(url: string): Promise<T> => request<T>(url, { method: 'DELETE' })
