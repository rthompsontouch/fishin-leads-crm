import { useEffect, useId, useState } from 'react'
import ForgotPasswordPanel from './ForgotPasswordPanel'

type Props = {
  open: boolean
  onClose: () => void
  initialEmail?: string
}

export default function ForgotPasswordDialog({ open, onClose, initialEmail = '' }: Props) {
  const titleId = useId()
  const [panelKey, setPanelKey] = useState(0)

  useEffect(() => {
    if (open) setPanelKey((k) => k + 1)
  }, [open])

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
    const t = window.requestAnimationFrame(() => {
      document.querySelector<HTMLInputElement>('[data-fishin-forgot-dialog] input[type="email"]')?.focus()
    })
    return () => window.cancelAnimationFrame(t)
  }, [open, panelKey])

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
        data-fishin-forgot-dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex w-full flex-col overflow-hidden border shadow-2xl max-md:fixed max-md:inset-0 max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none max-md:border-x-0 max-md:border-t-0 md:max-h-[90dvh] md:max-w-md md:rounded-2xl"
        style={{
          background: 'var(--color-background)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-foreground)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 max-md:pt-[max(0.75rem,env(safe-area-inset-top))]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 id={titleId} className="text-lg font-semibold m-0 pr-2">
            Reset password
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold border cursor-pointer min-h-11 transition-colors hover:opacity-90"
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
        <div className="min-h-0 flex-1 overflow-y-auto crm-scrollbar p-4 md:p-5 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-sm opacity-85 m-0 mb-4" style={{ color: 'var(--color-foreground)' }}>
            We&apos;ll email you a link to choose a new password.
          </p>
          <ForgotPasswordPanel
            key={panelKey}
            initialEmail={initialEmail}
            hideFooterLink
            omitHeading
            onRequestClose={onClose}
          />
        </div>
      </div>
    </div>
  )
}
