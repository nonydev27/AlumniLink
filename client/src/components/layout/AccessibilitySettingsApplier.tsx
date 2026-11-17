import { useEffect } from 'react'
import { useStore } from '../../lib/store'

const sizes = { normal: '100%', large: '112.5%', larger: '125%' }

/** Applies the signed-in user's accessibility preferences to <html>. */
export function AccessibilitySettingsApplier() {
  const { myState } = useStore()
  const { textSize, highContrast, reduceMotion } = myState.settings

  useEffect(() => {
    const root = document.documentElement
    root.style.fontSize = sizes[textSize]
    root.classList.toggle('hc', highContrast)
    root.classList.toggle('reduce-motion', reduceMotion)
  }, [textSize, highContrast, reduceMotion])

  return null
}
