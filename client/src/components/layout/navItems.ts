import type { IconName } from '../ui/Icon'
import type { Role } from '../../types'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  badge?: 'network' | 'messages'
  roles?: Role[]
}

export const sidebarItems: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: 'home' },
  { to: '/directory', label: 'Directory', icon: 'search' },
  { to: '/network', label: 'My network', icon: 'users', badge: 'network' },
  { to: '/messages', label: 'Messages', icon: 'chat', badge: 'messages' },
  { to: '/opportunities', label: 'Opportunities', icon: 'briefcase' },
  { to: '/batches', label: 'Batch groups', icon: 'graduation' },
  { to: '/profile', label: 'My profile', icon: 'user' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/admin', label: 'Admin', icon: 'shield', roles: ['admin'] },
]

/** Mobile bottom bar: the most-used destinations, within thumb reach (Fitts' Law). */
export const bottomItems: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: 'home' },
  { to: '/directory', label: 'Alumni', icon: 'search' },
  { to: '/opportunities', label: 'Jobs', icon: 'briefcase' },
  { to: '/messages', label: 'Messages', icon: 'chat', badge: 'messages' },
  { to: '/profile', label: 'Profile', icon: 'user' },
]
