import { NavLink, Outlet, useNavigate } from 'react-router'
import { unreadCount, useStore } from '../../lib/store'
import { cx } from '../../lib/format'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { Logo } from './Logo'
import { SkipLink } from './SkipLink'
import { bottomItems, sidebarItems, type NavItem } from './navItems'

function useBadges() {
  const { me, db } = useStore()
  if (!me) return { network: 0, messages: 0 }
  return {
    network: db.connections.filter((c) => c.toId === me.id && c.status === 'pending').length,
    messages: db.conversations.filter((c) => c.participantIds.includes(me.id)).reduce((n, c) => n + unreadCount(c, me.id), 0),
  }
}

function CountBadge({ n, label }: { n: number; label: string }) {
  if (!n) return null
  return (
    <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-brand-700 px-1.5 text-xs font-bold text-white">
      {n}
      <span className="sr-only"> {label}</span>
    </span>
  )
}

/** Signed-in layout: sidebar on desktop (screen edge), bottom bar on mobile (thumb zone). */
export function AppShell() {
  const { me, logout } = useStore()
  const badges = useBadges()
  const navigate = useNavigate()
  if (!me) return null

  const visible = (i: NavItem) => !i.roles || i.roles.includes(me.role)
  const badgeLabel = (b?: NavItem['badge']) => (b === 'network' ? 'pending requests' : 'unread messages')

  return (
    <div className="min-h-screen bg-slate-50">
      <SkipLink />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center px-5"><Logo to="/dashboard" /></div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {sidebarItems.filter(visible).map((i) => (
              <li key={i.to}>
                <NavLink
                  to={i.to}
                  className={({ isActive }) =>
                    cx(
                      'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-600',
                      isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <Icon name={i.icon} />
                  {i.label}
                  {i.badge && <CountBadge n={badges[i.badge]} label={badgeLabel(i.badge)} />}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={me.name} color={me.avatarColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{me.name}</p>
              <p className="truncate text-xs capitalize text-slate-600">{me.role === 'alumni' ? 'Alumnus' : me.role}</p>
            </div>
            <button
              type="button"
              onClick={() => { logout(); navigate('/') }}
              aria-label="Sign out"
              title="Sign out"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Logo to="/dashboard" />
        <div className="flex items-center gap-1">
          <NavLink to="/network" aria-label={`My network${badges.network ? `, ${badges.network} pending requests` : ''}`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100">
            <Icon name="users" />
            {badges.network > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-700 ring-2 ring-white" aria-hidden="true" />}
          </NavLink>
          <NavLink to="/batches" aria-label="Batch groups" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100">
            <Icon name="graduation" />
          </NavLink>
          <NavLink to="/settings" aria-label="Settings" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100">
            <Icon name="settings" />
          </NavLink>
          {me.role === 'admin' && (
            <NavLink to="/admin" aria-label="Admin" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100">
              <Icon name="shield" />
            </NavLink>
          )}
        </div>
      </header>

      <div className="lg:pl-64">
        {me.verification === 'pending' && (
          <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-8">
            <strong className="font-semibold">Verification pending.</strong> The Alumni Relations Office is checking your graduation details. You can browse and edit your profile in the meantime.
          </div>
        )}
        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-28 pt-6 focus:outline-none sm:px-8 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-5">
          {bottomItems.map((i) => (
            <li key={i.to}>
              <NavLink
                to={i.to}
                className={({ isActive }) =>
                  cx('relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold', isActive ? 'text-brand-700' : 'text-slate-600')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-700" aria-hidden="true" />}
                    <Icon name={i.icon} className="h-6 w-6" />
                    {i.label}
                    {i.badge && badges[i.badge] > 0 && (
                      <span className="absolute left-1/2 top-2 ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[0.7rem] text-white">
                        {badges[i.badge]}<span className="sr-only"> {badgeLabel(i.badge)}</span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
