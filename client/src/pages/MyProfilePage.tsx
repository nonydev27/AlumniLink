import { ProfileView } from '../components/profile/ProfileView'
import { useStore } from '../lib/store'

export default function MyProfilePage() {
  const { me } = useStore()
  if (!me) return null
  return <ProfileView user={me} />
}
