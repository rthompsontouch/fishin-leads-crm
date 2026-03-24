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
        data-fishin-forgot-dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[90dvh] overflow-y-auto"
        style={{
          background: 'var(--color-background)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-foreground)',
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 id={titleId} className="text-lg font-semibold m-0">
            Reset password
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-semibold border cursor-pointer transition-colors hover:opacity-90"
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
        <div className="p-5">
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
