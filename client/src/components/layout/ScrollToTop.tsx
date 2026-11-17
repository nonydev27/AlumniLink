import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Reset scroll on route change, but let in-page hash links (/#section) scroll to their target. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
