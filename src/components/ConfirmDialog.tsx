import { useEffect, useId, useState, type ReactNode } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import ModalScrollBackdrop from './ModalScrollBackdrop'

const cancelBtnClass =
  'rounded-md px-4 py-2 text-sm font-semibold cursor-pointer transition-colors duration-150 border-2 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'

export type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  /** Called when user confirms; dialog closes after successful resolution (no throw). */
  onConfirm: () => void | Promise<void>
  title: string
  description?: ReactNode
  /** Default: "Delete" for danger, "Confirm" for primary */
  confirmLabel?: string
  cancelLabel?: string
  /** danger = red destructive; primary = brand (e.g. convert, regenerate) */
  variant?: 'danger' | 'primary'
  /** Hide the header icon (default: trash for danger, alert for primary) */
  hideIcon?: boolean
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'danger',
  hideIcon = false,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descId = useId()
  const [busy, setBusy] = useState(false)

  const showIcon = !hideIcon

  useEffect(() => {
    if (!open) setBusy(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  const defaultConfirm = variant === 'danger' ? 'Delete' : 'Confirm'
  const label = confirmLabel ?? defaultConfirm

  const confirmClass =
    variant === 'danger'
      ? 'rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 border-2 border-transparent'
      : 'rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] border-2 border-transparent'

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      // Parent can surface errors; keep dialog open
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalScrollBackdrop
      onBackdropClose={() => {
        if (!busy) onClose()
      }}
      zClass="z-[70]"
      backdropStyle={{ background: 'rgba(15, 23, 42, 0.62)' }}
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
    >
      <div
        className="my-4 w-full max-w-md max-h-[min(88dvh,640px)] min-h-0 flex flex-col rounded-xl shadow-xl ring-1 ring-black/10 overflow-hidden"
        style={{
          background: 'var(--color-background, #fff)',
          color: 'var(--crm-content-header-text, #0f172a)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 pt-5 pb-4 border-b flex-1 min-h-0 overflow-y-auto crm-scrollbar"
          style={{ borderColor: 'hsl(215 20% 88%)' }}
        >
          <div className="flex gap-3">
            {showIcon ? (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    variant === 'danger'
                      ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
                      : 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                }}
              >
                {variant === 'danger' ? (
                  <Trash2
                    className="h-5 w-5"
                    style={{ color: 'var(--color-danger)' }}
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : (
                  <AlertTriangle
                    className="h-5 w-5"
                    style={{ color: 'var(--color-primary)' }}
                    strokeWidth={2}
                    aria-hidden
                  />
                )}
              </div>
            ) : null}
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id={titleId} className="text-lg font-semibold leading-snug m-0">
                {title}
              </h2>
              {description ? (
                <div id={descId} className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {description}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="px-5 py-4 flex flex-wrap items-center justify-end gap-2 shrink-0"
          style={{ background: 'hsl(215 25% 98%)' }}
        >
          <button
            type="button"
            className={cancelBtnClass}
            style={{
              color: 'var(--crm-content-header-text)',
              borderColor: 'hsl(215 22% 72%)',
            }}
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} onClick={() => void handleConfirm()} disabled={busy}>
            {busy ? 'Please wait…' : label}
          </button>
        </div>
      </div>
    </ModalScrollBackdrop>
  )
}
