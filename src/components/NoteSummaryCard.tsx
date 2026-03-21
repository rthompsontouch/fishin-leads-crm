import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  NOTEPAD_CLASS,
  NOTEPAD_STYLE,
  displayNoteTitle,
  truncateNotePreview,
} from '../lib/noteUi'

type NoteSummaryCardProps = {
  to: string
  title: string | null | undefined
  body: string
  type: string
  occurredAt: string
  /** e.g. delete button — kept outside the link so it doesn’t navigate */
  rightSlot?: ReactNode
}

export default function NoteSummaryCard({
  to,
  title,
  body,
  type,
  occurredAt,
  rightSlot,
}: NoteSummaryCardProps) {
  const heading = displayNoteTitle(title, body)
  const preview = body.trim() ? truncateNotePreview(body, 100) : '—'

  return (
    <div className="relative">
      <Link
        to={to}
        className={`block ${NOTEPAD_CLASS} p-3 no-underline ${rightSlot ? 'pr-[4.5rem]' : ''}`}
        style={NOTEPAD_STYLE}
      >
        <div className="text-sm font-semibold leading-snug text-gray-900">{heading}</div>
        <div className="text-sm mt-1.5 leading-snug text-gray-900 opacity-90">{preview}</div>
        <div className="text-xs mt-2 text-gray-800 opacity-75">
          {new Date(occurredAt).toLocaleString()} • {type}
        </div>
      </Link>
      {rightSlot ? (
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">{rightSlot}</div>
      ) : null}
    </div>
  )
}
