/* eslint-disable react-refresh/only-export-components */
// Client-side data store for AlumniLink.
//
// Until the backend exists, this acts as a mock API: data lives in memory and is
// persisted to localStorage so the demo survives a refresh. Each action below maps
// 1:1 to a future REST endpoint, so swapping in real fetch calls is mechanical.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type {
  AppSettings, BatchPost, Connection, ConnectionKind, Conversation, Opportunity, Report, ReportTarget, User, UserState,
} from '../types'
import { seedBatchPosts, seedConnections, seedConversations, seedOpportunities, seedReports, seedUsers } from '../data/seed'

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
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...seedDB(), ...JSON.parse(raw) }
  } catch {
    /* storage unavailable or corrupt: fall back to seed */
  }
  return seedDB()
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const now = () => new Date().toISOString()

export interface RegisterInput {
  role: 'student' | 'alumni'
  name: string
  email: string
  indexNumber: string
  programme: string
  gradYear: number
}

function useStoreValue() {
  const [db, setDb] = useState<DB>(loadDB)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      /* ignore quota / private mode */
    }
  }, [db])

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
    // ---- Auth ----
    login(email: string): User | null {
      const user = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase()) ?? null
      if (user) setDb((d) => ({ ...d, currentUserId: user.id }))
      return user
    },
    logout() {
      setDb((d) => ({ ...d, currentUserId: null }))
    },
    register(input: RegisterInput): User {
      const user: User = {
        id: uid('u'),
        role: input.role,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        indexNumber: input.indexNumber.trim(),
        programme: input.programme,
        gradYear: input.gradYear,
        headline: input.role === 'student' ? `${input.programme} student` : `${input.programme} graduate`,
        bio: '',
        location: '',
        skills: [],
        interests: [],
        careerGoals: '',
        mentoring: false,
        // Alumni are verified by the Alumni Relations Office. Students are verified
        // against their index number by the backend; the demo trusts it.
        verification: input.role === 'alumni' ? 'pending' : 'verified',
        avatarColor: 'bg-brand-100 text-brand-800',
        privacy: { showEmailToConnections: true, showCompany: true, allowMessagesFrom: 'everyone' },
        joinedAt: now(),
      }
      setDb((d) => ({
        ...d,
        users: [...d.users, user],
        currentUserId: user.id,
        userState: { ...d.userState, [user.id]: { ...emptyUserState(), joinedBatches: [input.gradYear] } },
      }))
      return user
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
    toggleJoinBatch(year: number) {
      patchMyState((s) => ({ ...s, joinedBatches: s.joinedBatches.includes(year) ? s.joinedBatches.filter((y) => y !== year) : [...s.joinedBatches, year] }))
    },
    addBatchPost(gradYear: number, body: string) {
      setDb((d) => (d.currentUserId && body.trim() ? { ...d, batchPosts: [{ id: uid('p'), gradYear, authorId: d.currentUserId, body: body.trim(), createdAt: now() }, ...d.batchPosts] } : d))
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

  return { db, me, myState, ...actions }
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
