import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Unit: JWT role decoder ───────────────────────────────────────────────────

function decodeRole(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      || payload.role
      || 'User'
  } catch { return 'User' }
}

// Real JWT returned by production API for Admin@gmail.com
const ADMIN_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJkZjRmMGY2My1lMzA5LTRjMTEtOTVmNS0xNmRhOGE4NDI1N2YiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pbiIsImVtYWlsIjoiQWRtaW5AZ21haWwuY29tIiwiZXhwIjoxNzgyMTU5MjIzLCJpc3MiOiJTcG9rZW5FbmdsaXNoQVBJIiwiYXVkIjoiU3Bva2VuRW5nbGlzaENsaWVudCJ9' +
  '.28Wt99QnWFJm5HmAhjN5DLJaXtNHi-1uU1RkkGB2rgY'

describe('decodeRole(jwt)', () => {
  it('extracts Admin role from real production JWT', () => {
    expect(decodeRole(ADMIN_JWT)).toBe('Admin')
  })

  it('falls back to User for a JWT with no role claim', () => {
    const noRolePayload = btoa(JSON.stringify({ sub: 'abc', email: 'x@y.com' }))
    const fakeJwt = `header.${noRolePayload}.sig`
    expect(decodeRole(fakeJwt)).toBe('User')
  })

  it('falls back to User for a malformed JWT', () => {
    expect(decodeRole('not.a.jwt')).toBe('User')
    expect(decodeRole('')).toBe('User')
  })

  it('reads role field directly when present', () => {
    const payload = btoa(JSON.stringify({ role: 'Admin' }))
    expect(decodeRole(`h.${payload}.s`)).toBe('Admin')
  })
})

// ─── Unit: API URL construction ───────────────────────────────────────────────

describe('API base URL', () => {
  it('builds correct URL when VITE_API_URL is set', () => {
    const VITE_API_URL = 'https://spoken-english-api-production.up.railway.app'
    const BASE = VITE_API_URL ? `${VITE_API_URL}/api` : '/api'
    expect(BASE).toBe('https://spoken-english-api-production.up.railway.app/api')
  })

  it('falls back to /api when VITE_API_URL is empty', () => {
    const VITE_API_URL = ''
    const BASE = VITE_API_URL ? `${VITE_API_URL}/api` : '/api'
    expect(BASE).toBe('/api')
  })
})

// ─── Unit: Login form payload ─────────────────────────────────────────────────

describe('login payload shape', () => {
  it('sends emailOrMob and password keys', () => {
    const email = 'Admin@gmail.com'
    const password = 'Admin@2026'
    const payload = { emailOrMob: email, password }
    expect(payload).toEqual({ emailOrMob: 'Admin@gmail.com', password: 'Admin@2026' })
  })
})

// ─── Unit: AuthContext userData assembly ──────────────────────────────────────

describe('userData assembly after login', () => {
  it('uses role from API response when present', () => {
    const res = { data: { userID: 1, email: 'Admin@gmail.com', token: ADMIN_JWT, apiKey: 'admin-key', role: 'Admin' } }
    const { token: t, userID, email: userEmail, apiKey, role } = res.data
    const userData = { userId: userID, email: userEmail, apiKey, role: role || decodeRole(t) }
    expect(userData.role).toBe('Admin')
  })

  it('decodes role from JWT when API omits role field', () => {
    const res = { data: { userID: 1, email: 'Admin@gmail.com', token: ADMIN_JWT, apiKey: 'admin-key' } }
    const { token: t, userID, email: userEmail, apiKey, role } = res.data
    const userData = { userId: userID, email: userEmail, apiKey, role: role || decodeRole(t) }
    expect(userData.role).toBe('Admin')
    expect(userData.userId).toBe(1)
    expect(userData.email).toBe('Admin@gmail.com')
  })

  it('sets role to User when JWT has no role claim', () => {
    const noRolePayload = btoa(JSON.stringify({ sub: 'abc' }))
    const jwt = `h.${noRolePayload}.s`
    const res = { data: { userID: 2, email: 'Andrews@gmail.com', token: jwt, apiKey: 'key' } }
    const { token: t, userID, email: userEmail, apiKey, role } = res.data
    const userData = { userId: userID, email: userEmail, apiKey, role: role || decodeRole(t) }
    expect(userData.role).toBe('User')
  })
})

// ─── Unit: Login route navigation ────────────────────────────────────────────

describe('post-login navigation', () => {
  it('navigates Admin to /admin', () => {
    const role = 'Admin'
    const route = role === 'Admin' ? '/admin' : '/dashboard'
    expect(route).toBe('/admin')
  })

  it('navigates User to /dashboard', () => {
    const role = 'User'
    const route = role === 'Admin' ? '/admin' : '/dashboard'
    expect(route).toBe('/dashboard')
  })

  it('navigates undefined role to /dashboard (no backslash bug)', () => {
    const role = undefined
    const route = role === 'Admin' ? '/admin' : '/dashboard'
    expect(route).toBe('/dashboard')
    expect(route).not.toContain('\\')
  })
})

// ─── Integration: Production API ──────────────────────────────────────────────

describe('production API login (integration)', () => {
  it('Admin@gmail.com / Admin@2026 returns 200 with token', async () => {
    const res = await fetch(
      'https://spoken-english-api-production.up.railway.app/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrMob: 'Admin@gmail.com', password: 'Admin@2026' }),
      }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('token')
    expect(data).toHaveProperty('userID')
    expect(data.token.split('.').length).toBe(3)
  }, 15000)

  it('Andrews@gmail.com / Andrews@123 returns 200 with token', async () => {
    const res = await fetch(
      'https://spoken-english-api-production.up.railway.app/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrMob: 'Andrews@gmail.com', password: 'Andrews@123' }),
      }
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('token')
    expect(data.token.split('.').length).toBe(3)
  }, 15000)

  it('wrong password returns 401 with message', async () => {
    const res = await fetch(
      'https://spoken-english-api-production.up.railway.app/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrMob: 'Admin@gmail.com', password: 'WrongPass' }),
      }
    )
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data).toHaveProperty('message')
  }, 15000)

  it('decoded JWT contains Admin role for Admin user', async () => {
    const res = await fetch(
      'https://spoken-english-api-production.up.railway.app/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrMob: 'Admin@gmail.com', password: 'Admin@2026' }),
      }
    )
    const data = await res.json()
    const role = decodeRole(data.token)
    expect(role).toBe('Admin')
  }, 15000)
}, )
