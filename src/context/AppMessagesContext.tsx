import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastVariant = 'error' | 'success' | 'info'

type ToastItem = {
  id: string
  variant: ToastVariant
  message: string
}

type NotifyOptions = {
  /** Default 5200ms */
  durationMs?: number
}

type AppMessagesContextValue = {
  /** Floating toast — use for API errors, success, or app-level issues (e.g. server unavailable). */
  notify: (variant: ToastVariant, message: string, options?: NotifyOptions) => void
  toastError: (message: string, options?: NotifyOptions) => void
  toastSuccess: (message: string, options?: NotifyOptions) => void
  toastInfo: (message: string, options?: NotifyOptions) => void
  /** Dismiss a toast by id (advanced). */
  dismiss: (id: string) => void
}

const AppMessagesContext = createContext<AppMessagesContextValue | null>(null)

function normalizeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Something went wrong.'
  }
}

/** Map unknown throws (e.g. Supabase) to a user-facing string, then toast. */
export function formatErrorForUser(err: unknown): string {
  return normalizeError(err)
}

export function AppMessagesProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
    setToasts((list) => list.filter((x) => x.id !== id))
  }, [])

  const notify = useCallback(
    (variant: ToastVariant, message: string, options?: NotifyOptions) => {
      const id = crypto.randomUUID()
      const durationMs = options?.durationMs ?? 5200

      setToasts((list) => [...list, { id, variant, message }])

      const timer = setTimeout(() => {
        dismiss(id)
      }, durationMs)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  const toastError = useCallback(
    (message: string, options?: NotifyOptions) => notify('error', message, options),
    [notify],
  )
  const toastSuccess = useCallback(
    (message: string, options?: NotifyOptions) => notify('success', message, options),
    [notify],
  )
  const toastInfo = useCallback(
    (message: string, options?: NotifyOptions) => notify('info', message, options),
    [notify],
  )

  const value = useMemo(
    () => ({ notify, toastError, toastSuccess, toastInfo, dismiss }),
    [notify, toastError, toastSuccess, toastInfo, dismiss],
  )

  return (
    <AppMessagesContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </AppMessagesContext.Provider>
  )
}

export function useAppMessages(): AppMessagesContextValue {
  const ctx = useContext(AppMessagesContext)
  if (!ctx) {
    throw new Error('useAppMessages must be used within AppMessagesProvider')
  }
  return ctx
}

/** Optional: use in leaf components that may render outside provider during tests. */
export function useAppMessagesOptional(): AppMessagesContextValue | null {
  return useContext(AppMessagesContext)
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex max-w-[min(100vw-2rem,24rem)] flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onDismiss(t.id)}
          className={[
            'pointer-events-auto w-full text-left rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-opacity hover:opacity-95 crm-toast-item',
            t.variant === 'error' ? 'crm-toast-error' : '',
            t.variant === 'success' ? 'crm-toast-success' : '',
            t.variant === 'info' ? 'crm-toast-info' : '',
          ].join(' ')}
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1">{t.message}</span>
            <span className="shrink-0 text-[10px] opacity-50 font-normal">Dismiss</span>
          </div>
        </button>
      ))}
    </div>
  )
}
