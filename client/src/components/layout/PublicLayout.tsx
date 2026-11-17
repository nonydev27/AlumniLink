import { Outlet } from 'react-router'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { SkipLink } from './SkipLink'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SkipLink />
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
