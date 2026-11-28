/* eslint-disable react-refresh/only-export-components */
// Client store for AlumniLink.
//
// Authentication is live against /api/v2/auth (tokens, email verification and
// password reset). Directory, messaging and other domain screens still render
// seeded demo data from localStorage until their REST calls are wired; the
// signed-in user always comes from the API and is never a demo account.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type {
  AppSettings, BatchPost, Connection, ConnectionKind, Conversation, Opportunity, Report, ReportTarget, User, UserState,
} from '../types'
import { seedBatchPosts, seedConnections, seedConversations, seedOpportunities, seedReports, seedUsers } from '../data/seed'
import {
  ApiError, authApi, clearTokens, getSessionExtras, getTokens, saveSession, toClientUser, updateSession,
  type ServerUser,
} from './api'

const STORAGE_KEY = 'alumnilink-db-v1'

export const defaultSettings: AppSettings = {
  aiEnabled: true,
  aiDetail: 'detailed',
  textSize: 'normal',
  highContrast: false,
  reduceMotion: false,
}

const emptyUserState = (): UserState => ({
  dismissedMatches: [],
  savedOpportunities: [],
  blocked: [],
  joinedBatches: [],
  aiFeedback: {},
  settings: { ...defaultSettings },
})

interface DB {
  currentUserId: string | null
  users: User[]
  connections: Connection[]
  conversations: Conversation[]
  opportunities: Opportunity[]
  batchPosts: BatchPost[]
  reports: Report[]
  userState: Record<string, UserState>
}

const seedDB = (): DB => ({
  currentUserId: null,
  users: seedUsers,
  connections: seedConnections,
  conversations: seedConversations,
  opportunities: seedOpportunities,
  batchPosts: seedBatchPosts,
  reports: seedReports,
  userState: {},
})

function loadDB(): DB {
  let loaded = seedDB()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) loaded = { ...loaded, ...JSON.parse(raw) }
  } catch {
    /* storage unavailable or corrupt: fall back to seed */
  }
  // Never treat a stale mock session as a real login, and always seed the
  // signed-in user from the live session before the first render.
  if (!getTokens()) return { ...loaded, currentUserId: null }
  const cached = getSessionExtras().user
  if (!cached) return { ...loaded, currentUserId: null }
  const user = toClientUser(cached)
  return {
    ...loaded,
    currentUserId: user.id,
    users: [...loaded.users.filter((u) => u.id !== user.id), user],
  }
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const now = () => new Date().toISOString()

/** A graduation year is shared by several programmes, so batch identity needs both. */
export const batchKey = (year: number, programme: string) => `${year}|${programme}`

export interface RegisterInput {
  role: 'student' | 'alumni'
  fullName: string
  email: string
  password: string
  programme: string
  graduationYear: number
  acceptTerms: boolean
}

export type AuthGate = { verificationRequired: boolean; termsAcceptanceRequired: boolean }

function useStoreValue() {
  const [db, setDb] = useState<DB>(loadDB)
  const [authLoading, setAuthLoading] = useState(Boolean(getTokens()))
  const [gate, setGate] = useState<AuthGate>(() => {
    const saved = getSessionExtras()
    return {
      verificationRequired: Boolean(saved.verificationRequired),
      termsAcceptanceRequired: Boolean(saved.termsAcceptanceRequired),
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      /* ignore quota / private mode */
    }
  }, [db])

  const applyUser = useCallback((serverUser?: ServerUser) => {
    if (!serverUser) return
    const user = toClientUser(serverUser)
    setDb((d) => ({
      ...d,
      currentUserId: user.id,
      users: [...d.users.filter((u) => u.id !== user.id), user],
    }))
  }, [])

  const applyGate = useCallback((next: AuthGate) => {
    updateSession(next)
    setGate(next)
  }, [])

  useEffect(() => {
    if (!getTokens()) return
    let active = true
    authApi.self()
      .then(({ user }) => { if (active) applyUser(user) })
      .catch((error: unknown) => {
        if (!active) return
        // 403 is expected while email verification or current terms are pending.
        if (error instanceof ApiError && error.status === 401) {
          clearTokens()
          setDb((d) => ({ ...d, currentUserId: null }))
        }
      })
      .finally(() => { if (active) setAuthLoading(false) })
    return () => { active = false }
  }, [applyUser])

  const me = db.users.find((x) => x.id === db.currentUserId) ?? null
  const myState = (me && db.userState[me.id]) || emptyUserState()

  const patchMyState = useCallback((fn: (s: UserState) => UserState) => {
    setDb((d) => {
      if (!d.currentUserId) return d
      const cur = d.userState[d.currentUserId] ?? emptyUserState()
      return { ...d, userState: { ...d.userState, [d.currentUserId]: fn(cur) } }
    })
  }, [])

  const actions = {
    // ---- Live auth (v2 API) ----
    async login(email: string, password: string): Promise<AuthGate> {
      const result = await authApi.login(email, password)
      const { user, tokens } = result.data
      if (!user) throw new Error('The server did not return your account details.')
      const next: AuthGate = {
        verificationRequired: result.data.verificationRequired === true,
        termsAcceptanceRequired: result.data.termsAcceptanceRequired === true,
      }
      saveSession(tokens, { user, ...next })
      applyUser(user)
      applyGate(next)
      return next
    },
    async register(input: RegisterInput) {
      const result = await authApi.register({
        role: input.role,
        fullName: input.fullName,
        email: input.email,
        password: input.password,
        programme: input.programme,
        graduationYear: input.graduationYear,
        acceptTerms: input.acceptTerms,
      })
      const user = result.data.user
      const next: AuthGate = { verificationRequired: true, termsAcceptanceRequired: false }
      saveSession(result.data.tokens, { user, ...next })
      applyUser(user)
      applyGate(next)
      return result.data
    },
    async logout() {
      await authApi.logout()
      setDb((d) => ({ ...d, currentUserId: null }))
      setGate({ verificationRequired: false, termsAcceptanceRequired: false })
    },
    async markVerified(): Promise<AuthGate> {
      const next = { ...gate, verificationRequired: false }
      applyGate(next)
      try {
        const { user } = await authApi.self()
        updateSession({ user })
        applyUser(user)
      } catch { /* terms may still be pending; the cached profile is enough */ }
      return next
    },
    async acceptCurrentTerms(): Promise<AuthGate> {
      await authApi.acceptTerms()
      const next = { ...gate, termsAcceptanceRequired: false }
      applyGate(next)
      return next
    },
    updateProfile(patch: Partial<User>) {
      setDb((d) => ({ ...d, users: d.users.map((x) => (x.id === d.currentUserId ? { ...x, ...patch, id: x.id, role: x.role, verification: x.verification } : x)) }))
    },
    deleteAccount() {
      setDb((d) => {
        const id = d.currentUserId
        if (!id) return d
        return {
          ...d,
          currentUserId: null,
          users: d.users.filter((x) => x.id !== id),
          connections: d.connections.filter((c) => c.fromId !== id && c.toId !== id),
          conversations: d.conversations.filter((c) => !c.participantIds.includes(id)),
          batchPosts: d.batchPosts.filter((p) => p.authorId !== id),
        }
      })
    },
    resetDemo() {
      setDb(seedDB())
    },

    // ---- Connections & mentorship ----
    requestConnection(toId: string, kind: ConnectionKind, note?: string) {
      setDb((d) => {
        if (!d.currentUserId) return d
        const exists = d.connections.some(
          (c) => c.status !== 'declined' && ((c.fromId === d.currentUserId && c.toId === toId) || (c.fromId === toId && c.toId === d.currentUserId)),
        )
        if (exists) return d
        return { ...d, connections: [...d.connections, { id: uid('c'), fromId: d.currentUserId, toId, kind, status: 'pending', note, createdAt: now() }] }
      })
    },
    respondToConnection(id: string, accept: boolean) {
      setDb((d) => ({ ...d, connections: d.connections.map((c) => (c.id === id ? { ...c, status: accept ? 'accepted' : 'declined' } : c)) }))
    },
    removeConnection(id: string) {
      setDb((d) => ({ ...d, connections: d.connections.filter((c) => c.id !== id) }))
    },

    // ---- Messaging ----
    /** Returns the conversation id with this user, creating one if needed. */
    openConversation(otherId: string): string {
      const meId = db.currentUserId!
      const existing = db.conversations.find((c) => c.participantIds.includes(meId) && c.participantIds.includes(otherId))
      if (existing) return existing.id
      const conv: Conversation = { id: uid('conv'), participantIds: [meId, otherId], messages: [], lastReadAt: {} }
      setDb((d) => ({ ...d, conversations: [...d.conversations, conv] }))
      return conv.id
    },
    sendMessage(conversationId: string, body: string) {
      setDb((d) => {
        const meId = d.currentUserId
        if (!meId || !body.trim()) return d
        return {
          ...d,
          conversations: d.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, { id: uid('m'), senderId: meId, body: body.trim(), sentAt: now() }], lastReadAt: { ...c.lastReadAt, [meId]: now() } }
              : c,
          ),
        }
      })
    },
    markRead(conversationId: string) {
      setDb((d) => {
        const meId = d.currentUserId
        if (!meId) return d
        return { ...d, conversations: d.conversations.map((c) => (c.id === conversationId ? { ...c, lastReadAt: { ...c.lastReadAt, [meId]: now() } } : c)) }
      })
    },

    // ---- Opportunities ----
    postOpportunity(o: Omit<Opportunity, 'id' | 'postedById' | 'postedAt'>) {
      setDb((d) => (d.currentUserId ? { ...d, opportunities: [{ ...o, id: uid('o'), postedById: d.currentUserId, postedAt: now() }, ...d.opportunities] } : d))
    },
    deleteOpportunity(id: string) {
      setDb((d) => ({ ...d, opportunities: d.opportunities.filter((o) => o.id !== id) }))
    },
    toggleSaveOpportunity(id: string) {
      patchMyState((s) => ({
        ...s,
        savedOpportunities: s.savedOpportunities.includes(id) ? s.savedOpportunities.filter((x) => x !== id) : [...s.savedOpportunities, id],
      }))
    },

    // ---- Batch groups ----
    toggleJoinBatch(key: string) {
      patchMyState((s) => ({ ...s, joinedBatches: s.joinedBatches.includes(key) ? s.joinedBatches.filter((y) => y !== key) : [...s.joinedBatches, key] }))
    },
    addBatchPost(gradYear: number, programme: string, body: string) {
      setDb((d) => (d.currentUserId && body.trim() ? {
        ...d,
        batchPosts: [{ id: uid('p'), gradYear, programme, authorId: d.currentUserId, body: body.trim(), createdAt: now() }, ...d.batchPosts],
      } : d))
    },
    deleteBatchPost(id: string) {
      setDb((d) => ({ ...d, batchPosts: d.batchPosts.filter((p) => p.id !== id) }))
    },

    // ---- Safety & moderation ----
    report(targetType: ReportTarget, targetId: string, reason: string) {
      setDb((d) => (d.currentUserId ? { ...d, reports: [...d.reports, { id: uid('r'), targetType, targetId, reporterId: d.currentUserId, reason, status: 'open', createdAt: now() }] } : d))
    },
    setReportStatus(id: string, status: Report['status']) {
      setDb((d) => ({ ...d, reports: d.reports.map((r) => (r.id === id ? { ...r, status } : r)) }))
    },
    setVerification(userId: string, verification: User['verification']) {
      setDb((d) => ({ ...d, users: d.users.map((x) => (x.id === userId ? { ...x, verification } : x)) }))
    },
    toggleBlock(userId: string) {
      patchMyState((s) => ({ ...s, blocked: s.blocked.includes(userId) ? s.blocked.filter((x) => x !== userId) : [...s.blocked, userId] }))
    },

    // ---- AI preferences & feedback ----
    dismissMatch(userId: string) {
      patchMyState((s) => ({ ...s, dismissedMatches: [...new Set([...s.dismissedMatches, userId])] }))
    },
    undismissMatch(userId: string) {
      patchMyState((s) => ({ ...s, dismissedMatches: s.dismissedMatches.filter((x) => x !== userId) }))
    },
    giveAIFeedback(key: string, value: 'helpful' | 'not-helpful') {
      patchMyState((s) => ({ ...s, aiFeedback: { ...s.aiFeedback, [key]: value } }))
    },
    updateSettings(patch: Partial<AppSettings>) {
      patchMyState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
    },
  }

  return { db, me, myState, authLoading, gate, ...actions }
}

type Store = ReturnType<typeof useStoreValue>
const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

// ---- Selectors ----

export function connectionBetween(connections: Connection[], a: string, b: string): Connection | undefined {
  return connections.find(
    (c) => c.status !== 'declined' && ((c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a)),
  )
}

export function isConnected(connections: Connection[], a: string, b: string): boolean {
  return connectionBetween(connections, a, b)?.status === 'accepted'
}

export function unreadCount(conv: Conversation, userId: string): number {
  const last = conv.lastReadAt[userId] ?? ''
  return conv.messages.filter((m) => m.senderId !== userId && m.sentAt > last).length
}
