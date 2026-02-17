import { createAuthClient } from 'better-auth/react';
import { API_BASE_URL } from './apiBase'

const resolvedBaseUrl = (() => {
  if (API_BASE_URL) {
    return new URL('/api/auth', API_BASE_URL).toString()
  }
  if (typeof window !== 'undefined') {
    return new URL('/api/auth', window.location.origin).toString()
  }
  return '/api/auth'
})()

export const authClient = createAuthClient({
  baseURL: resolvedBaseUrl,
});
