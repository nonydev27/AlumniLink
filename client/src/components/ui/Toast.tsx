/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

interface ToastItem { id: number; text: string }
const ToastContext = createContext<(text: string) => void>(() => {})

/**
 * Polite status messages. They stay until dismissed (no auto-timeout) so
 * everyone has time to read them (WCAG 2.2.1).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string) => {
    setItems((xs) => [...xs.slice(-2), { id: Date.now() + Math.random(), text }])
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-slate-900 py-2 pl-4 pr-2 text-sm text-white shadow-lg">
            <Icon name="check" className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="flex-1">{t.text}</span>
            <button type="button" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} aria-label="Dismiss notification" className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
