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
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] cursor-default border-0"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative z-10 w-full rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[min(92dvh,720px)] overflow-y-auto crm-scrollbar',
          wide ? 'sm:max-w-lg' : 'sm:max-w-md',
        ].join(' ')}
        style={{
          background: 'var(--color-background)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-foreground)',
        }}
      >
        <div
          className="sticky top-0 z-[1] flex items-center justify-between gap-3 px-5 py-3.5 border-b"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-background)',
          }}
        >
          <h2 id={titleId} className="text-lg font-semibold m-0">
            {title}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold border cursor-pointer min-h-11 min-w-11 sm:min-w-0 transition-colors hover:opacity-90"
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
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
