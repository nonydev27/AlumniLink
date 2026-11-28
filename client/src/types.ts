// Core domain types for AlumniLink.
// These mirror the shape the backend API is expected to return.

export type Role = 'student' | 'alumni' | 'admin'
export type VerificationStatus = 'verified' | 'pending' | 'rejected'

export interface PrivacySettings {
  /** Show contact email to accepted connections only (never to everyone). */
  showEmailToConnections: boolean
  showCompany: boolean
  allowMessagesFrom: 'everyone' | 'connections'
}

export interface User {
  id: string
  role: Role
  name: string
  email: string
  /** University index number, used for verification. */
  indexNumber?: string
  programme: string
  /** Graduation year (alumni) or expected graduation year (students). Defines the batch. */
  gradYear: number
  headline: string
  bio: string
  company?: string
  jobTitle?: string
  industry?: string
  location: string
  skills: string[]
  interests: string[]
  careerGoals: string
  /** Alumni only: open to mentoring requests. */
  mentoring: boolean
  verification: VerificationStatus
  avatarColor: string
  privacy: PrivacySettings
  joinedAt: string
}

export type ConnectionKind = 'connect' | 'mentorship'
export type ConnectionStatus = 'pending' | 'accepted' | 'declined'

export interface Connection {
  id: string
  fromId: string
  toId: string
  kind: ConnectionKind
  status: ConnectionStatus
  note?: string
  createdAt: string
}

export interface Message {
  id: string
  senderId: string
  body: string
  sentAt: string
}

export interface Conversation {
  id: string
  participantIds: [string, string]
  messages: Message[]
  /** userId -> ISO time they last read the thread */
  lastReadAt: Record<string, string>
}

export type OpportunityType = 'job' | 'internship' | 'webinar' | 'reunion' | 'event'

export interface Opportunity {
  id: string
  type: OpportunityType
  title: string
  organisation: string
  location: string
  mode: 'On-site' | 'Remote' | 'Hybrid' | 'Online'
  description: string
  tags: string[]
  postedById: string
  postedAt: string
  /** Application deadline (jobs/internships) or event date. */
  date?: string
  link?: string
  accessibilityNote?: string
}

export interface BatchPost {
  id: string
  gradYear: number
  /** Absent on legacy demo posts; those remain visible to every programme of the year. */
  programme?: string
  authorId: string
  body: string
  createdAt: string
}

export type ReportTarget = 'user' | 'opportunity' | 'post' | 'ai-match'

export interface Report {
  id: string
  targetType: ReportTarget
  targetId: string
  reporterId: string
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
}

export interface AppSettings {
  aiEnabled: boolean
  aiDetail: 'short' | 'detailed'
  textSize: 'normal' | 'large' | 'larger'
  highContrast: boolean
  reduceMotion: boolean
}

export interface UserState {
  dismissedMatches: string[]
  savedOpportunities: string[]
  blocked: string[]
  /** `${graduationYear}|${programme}` keys: a year alone is not a unique batch. */
  joinedBatches: string[]
  aiFeedback: Record<string, 'helpful' | 'not-helpful'>
  settings: AppSettings
}
