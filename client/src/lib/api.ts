// Thin, typed client for the live API. The dev server proxies /api to the
// Express service; set VITE_API_BASE_URL for a different origin (no trailing /api).
// Auth is real. Domain screens still render seeded demo data until each REST
// endpoint is wired to a page (see client/README.md).
const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const SESSION_KEY = 'alumnilink-session-v1'

type RoleValue = 'student' | 'alumni' | 'admin'

/** Server shape returned by /api/v2/auth/* and GET /api/v1/me. */
export type ServerUser = {
  id: string
  email: string
  role: RoleValue
  firstName: string
  lastName: string
  createdAt?: string
  verification?: { status?: string } | string
  privacy?: Record<string, unknown> | null
  profile?: {
    headline?: string | null
    bio?: string | null
    programme?: string | null
    graduationYear?: number | null
    currentCompany?: string | null
    jobTitle?: string | null
    industry?: string | null
    location?: string | null
    skills?: string[] | null
    interests?: string[] | null
    careerGoals?: string[] | null
    willingToMentor?: boolean
  } | null
}

export type TokenSet = {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt?: string
  refreshTokenExpiresAt?: string
}

type Session = TokenSet & {
  user?: ServerUser
  verificationRequired?: boolean
  termsAcceptanceRequired?: boolean
}
type SessionExtras = Omit<Session, keyof TokenSet>

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  readonly requestId?: string

  constructor(status: number, code: string, message: string, fields?: Record<string, string>, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.requestId = requestId
  }
}

export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Session
    return typeof value?.accessToken === 'string' && typeof value?.refreshToken === 'string' ? value : null
  } catch {
    return null
  }
}

let session = readSession()
let refreshing: Promise<boolean> | null = null

function writeSession(next: Session | null) {
  session = next
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* private mode */ }
}

export const getTokens = () => session
export const getSessionExtras = (): SessionExtras => ({
  user: session?.user,
  verificationRequired: Boolean(session?.verificationRequired),
  termsAcceptanceRequired: Boolean(session?.termsAcceptanceRequired),
})

export function saveSession(tokens: TokenSet, extras: SessionExtras = {}) {
  writeSession({ ...tokens, ...extras })
}

export function updateSession(extras: Partial<SessionExtras>) {
  if (session) writeSession({ ...session, ...extras })
}

export function clearTokens() {
  writeSession(null)
}

async function bodyOf(response: Response): Promise<unknown> {
  if (response.status === 204) return null
  try { return await response.json() } catch { return null }
}

async function refresh(): Promise<boolean> {
  if (!session?.refreshToken) return false
  if (!refreshing) {
    refreshing = (async () => {
      const response = await fetch(`${BASE}/v2/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session?.refreshToken }),
      })
      if (!response.ok) {
        clearTokens()
        return false
      }
      const payload = (await bodyOf(response)) as { data?: { tokens?: TokenSet } } | null
      const tokens = payload?.data?.tokens
      if (!tokens?.accessToken || !tokens.refreshToken) {
        clearTokens()
        return false
      }
      saveSession(tokens, getSessionExtras())
      return true
    })().finally(() => { refreshing = null })
  }
  return refreshing
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
}

const expiring = (value?: string) => {
  if (!value) return false
  const at = Date.parse(value)
  return Number.isFinite(at) && at <= Date.now() + 30_000
}

/** Always unwraps the API envelope and turns error envelopes into ApiError. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  if (auth && session?.refreshToken && expiring(session.accessTokenExpiresAt)) await refresh()
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`

  const send = () => fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  let response = await send()
  if (response.status === 401 && auth && session?.refreshToken && await refresh()) {
    headers.Authorization = `Bearer ${session?.accessToken ?? ''}`
    response = await send()
  }

  const payload = await bodyOf(response)
  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; fields?: Record<string, string>; requestId?: string } } | null)?.error
    throw new ApiError(
      response.status,
      error?.code ?? 'request_failed',
      error?.message ?? `Request failed (${response.status}). Please try again.`,
      error?.fields,
      error?.requestId ?? response.headers.get('x-request-id') ?? undefined,
    )
  }
  return payload as T
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')
const list = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [])

/** Adapts the server's flat self payload to the client's display model. */
export function toClientUser(row: ServerUser) {
  const profile = row.profile ?? {}
  const privacy = row.privacy ?? {}
  const status = typeof row.verification === 'string'
    ? row.verification
    : row.verification?.status ?? 'pending'
  return {
    id: row.id,
    role: row.role === 'admin' ? 'admin' as const : row.role === 'alumni' ? 'alumni' as const : 'student' as const,
    name: `${text(row.firstName)} ${text(row.lastName)}`.trim() || row.email,
    email: row.email,
    programme: text(profile.programme),
    gradYear: Number(profile.graduationYear ?? new Date().getFullYear()),
    headline: text(profile.headline),
    bio: text(profile.bio),
    company: text(profile.currentCompany) || undefined,
    jobTitle: text(profile.jobTitle) || undefined,
    industry: text(profile.industry) || undefined,
    location: text(profile.location),
    skills: list(profile.skills),
    interests: list(profile.interests),
    careerGoals: list(profile.careerGoals).join(', '),
    mentoring: Boolean(profile.willingToMentor),
    verification: status === 'verified' ? 'verified' as const : status === 'rejected' ? 'rejected' as const : 'pending' as const,
    avatarColor: 'bg-brand-100 text-brand-800',
    privacy: {
      showEmailToConnections: privacy.shareContactWithConnections === true,
      showCompany: privacy.showEmployer !== false,
      allowMessagesFrom: 'everyone' as const,
    },
    joinedAt: text(row.createdAt) || new Date().toISOString(),
  }
}

type AuthResult = {
  data: {
    user?: ServerUser
    tokens: TokenSet
    verificationRequired?: boolean
    termsAcceptanceRequired?: boolean
    verification?: { delivery: string }
    message?: string
  }
}

export const authApi = {
  register(input: {
    role: 'student' | 'alumni'
    fullName: string
    email: string
    password: string
    programme: string
    graduationYear: number
    acceptTerms: boolean
  }) {
    return apiRequest<AuthResult>('/v2/auth/register', { method: 'POST', body: input, auth: false })
  },
  login(email: string, password: string) {
    return apiRequest<AuthResult>('/v2/auth/login', { method: 'POST', body: { email, password }, auth: false })
  },
  async logout() {
    const token = session?.refreshToken
    clearTokens()
    if (token) {
      try {
        await apiRequest<null>('/v2/auth/logout', { method: 'POST', body: { refreshToken: token }, auth: false })
      } catch { /* local session is already gone */ }
    }
  },
  verifyEmail(token: string) {
    return apiRequest<{ data: { verified: boolean; email: string } }>('/v2/auth/verify-email', {
      method: 'POST', body: { token }, auth: false,
    })
  },
  resendVerification(email: string) {
    return apiRequest<{ data: { accepted: boolean } }>('/v2/auth/resend-verification', {
      method: 'POST', body: { email }, auth: false,
    })
  },
  forgotPassword(email: string) {
    return apiRequest<{ data: { accepted: boolean } }>('/v2/auth/forgot-password', {
      method: 'POST', body: { email }, auth: false,
    })
  },
  resetPassword(token: string, newPassword: string) {
    return apiRequest<{ data: { reset: boolean } }>('/v2/auth/reset-password', {
      method: 'POST', body: { token, newPassword }, auth: false,
    })
  },
  /** Requires a fully verified account; gates must be cleared first. */
  self() {
    return apiRequest<{ user: ServerUser }>('/v1/me')
  },
  acceptTerms() {
    return apiRequest<{ data: { accepted: boolean } }>('/v2/me/terms/accept', { method: 'POST', body: { acceptTerms: true } })
  },
  setMentorPreferences(body: { featuredMentorOptIn?: boolean; seekingMentorship?: boolean }) {
    return apiRequest<{ data: { featuredMentorOptIn?: boolean; seekingMentorship?: boolean } }>(
      '/v2/me/mentor-preferences', { method: 'PATCH', body },
    )
  },
}
