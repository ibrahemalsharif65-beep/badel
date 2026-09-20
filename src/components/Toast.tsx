import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

type Kind = 'success' | 'error'
interface ToastItem {
  id: number
  message: string
  kind: Kind
}
const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((message: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev.slice(-2), { id, message, kind }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3800)
  }, [])
  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-md animate-fade items-center gap-2.5 rounded-2xl border border-line bg-raised px-4 py-3 text-sm font-medium shadow-xl"
          >
            {t.kind === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-mint" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-danger" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
