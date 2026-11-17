import { Link, Navigate, useParams } from 'react-router'
import { ProfileView } from '../components/profile/ProfileView'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { useStore } from '../lib/store'

export default function PersonPage() {
  const { id } = useParams()
  const { me, db } = useStore()
  if (id === me?.id) return <Navigate to="/profile" replace />
  const user = db.users.find((u) => u.id === id)

  return (
    <>
      <Link to="/directory" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900">
        <Icon name="arrowLeft" className="h-4 w-4" />Back to directory
      </Link>
      {user ? <ProfileView user={user} /> : <EmptyState icon="user" title="Profile not found" body="This person may have left AlumniLink or changed their privacy settings." />}
    </>
  )
}
