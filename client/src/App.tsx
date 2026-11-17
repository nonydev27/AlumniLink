import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AccessibilitySettingsApplier } from './components/layout/AccessibilitySettingsApplier'
import { AppShell } from './components/layout/AppShell'
import { PublicLayout } from './components/layout/PublicLayout'
import { RequireAuth } from './components/layout/RequireAuth'
import { ScrollToTop } from './components/layout/ScrollToTop'
import HomePage from './pages/HomePage'
import { useStore } from './lib/store'

// Signed-in pages are code-split so the landing page stays light on slow connections.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DirectoryPage = lazy(() => import('./pages/DirectoryPage'))
const PersonPage = lazy(() => import('./pages/PersonPage'))
const MyProfilePage = lazy(() => import('./pages/MyProfilePage'))
const EditProfilePage = lazy(() => import('./pages/EditProfilePage'))
const NetworkPage = lazy(() => import('./pages/NetworkPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'))
const BatchesPage = lazy(() => import('./pages/BatchesPage'))
const BatchGroupPage = lazy(() => import('./pages/BatchGroupPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function Loading() {
  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center text-slate-600">
      Loading…
    </div>
  )
}

/** Logged-in users skip the login/register screens. */
function GuestOnly({ children }: { children: ReactNode }) {
  const { me } = useStore()
  return me ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AccessibilitySettingsApplier />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          </Route>

          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="people/:id" element={<PersonPage />} />
            <Route path="profile" element={<MyProfilePage />} />
            <Route path="profile/edit" element={<EditProfilePage />} />
            <Route path="network" element={<NetworkPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="messages/:conversationId" element={<MessagesPage />} />
            <Route path="opportunities" element={<OpportunitiesPage />} />
            <Route path="batches" element={<BatchesPage />} />
            <Route path="batches/:year" element={<BatchGroupPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<RequireAuth roles={['admin']}><AdminPage /></RequireAuth>} />
          </Route>

          <Route element={<PublicLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
