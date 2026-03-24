import type { CSSProperties, MouseEvent, ReactNode } from 'react'

type ModalScrollBackdropProps = {
  children: ReactNode
  onBackdropClose: () => void
  /** e.g. z-[70] — must beat app chrome */
  zClass?: string
  backdropStyle?: CSSProperties
  /** dialog props when used as modal root */
  role?: 'dialog'
  'aria-modal'?: boolean | 'true' | 'false'
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

/**
 * Scrollable full-screen overlay so tall modals work on mobile (iOS safe areas, small viewports).
 * Click outside the panel closes via backdrop targets only; put onMouseDown stopPropagation on the panel.
 */
export default function ModalScrollBackdrop({
  children,
  onBackdropClose,
  zClass = 'z-[70]',
  /** Dark enough to obscure the page and signal non-interactive content behind the dialog */
  backdropStyle = { background: 'rgba(0, 0, 0, 0.58)' },
  role,
  'aria-modal': ariaModal,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: ModalScrollBackdropProps) {
  function backdropMouseDown(e: MouseEvent) {
    if (e.target === e.currentTarget) onBackdropClose()
  }

  return (
    <div
      className={`fixed inset-0 overflow-y-auto overscroll-y-contain ${zClass}`}
      style={backdropStyle}
      role={role}
      aria-modal={ariaModal}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      onMouseDown={backdropMouseDown}
    >
      <div
        className="flex min-h-[100dvh] items-center justify-center p-3 sm:p-5 max-md:items-stretch max-md:justify-stretch max-md:p-0"
        onMouseDown={backdropMouseDown}
      >
        {children}
      </div>
    </div>
  )
}
