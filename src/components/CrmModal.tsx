import { useEffect, useId, type ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Wider modal on small screens (forms). */
  wide?: boolean
}

export default function CrmModal({ open, title, onClose, children, wide }: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 md:items-center md:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] cursor-default border-0 max-md:hidden"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 md:hidden bg-black/40"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative z-10 flex w-full flex-col overflow-hidden border shadow-2xl crm-scrollbar',
          'max-md:fixed max-md:inset-0 max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none max-md:border-x-0 max-md:border-t-0',
          'md:max-h-[min(92dvh,720px)] md:rounded-2xl',
          wide ? 'md:max-w-lg' : 'md:max-w-md',
        ].join(' ')}
        style={{
          background: 'var(--color-background)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-foreground)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 z-[1] flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3.5 md:px-5 max-md:pt-[max(0.75rem,env(safe-area-inset-top))]"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-background)',
          }}
        >
          <h2 id={titleId} className="text-lg font-semibold m-0 pr-2">
            {title}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold border cursor-pointer min-h-11 min-w-11 md:min-w-0 transition-colors hover:opacity-90"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface-1)',
              color: 'var(--color-foreground)',
            }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}
