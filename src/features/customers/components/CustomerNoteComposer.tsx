import { useState } from 'react'
import { z } from 'zod'
import { addCustomerNote, type CreateCustomerNoteInput } from '../api/customersApi'

const typeValues = ['note', 'call', 'email_sent', 'meeting', 'other'] as const
type NoteType = (typeof typeValues)[number]

const schema = z.object({
  type: z.enum(typeValues),
  title: z.string().min(1, 'Title is required.').max(200, 'Title is too long.'),
  body: z.string().min(1, 'Body is required.'),
  occurredAtLocal: z.string().min(1, 'Occurred time is required.'),
})

export default function CustomerNoteComposer({
  customerId,
  onAdded,
  onError,
}: {
  customerId: string
  onAdded: () => Promise<void>
  onError: (msg: string) => void
}) {
  const [type, setType] = useState<NoteType>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [occurredAtLocal, setOccurredAtLocal] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [submitting, setSubmitting] = useState(false)

  return (
    <form
      className="grid grid-cols-1 gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        const parsed = schema.safeParse({ type, title, body, occurredAtLocal })
        if (!parsed.success) {
          onError(parsed.error.issues[0]?.message ?? 'Invalid input')
          return
        }

        setSubmitting(true)
        try {
          const occurred = new Date(occurredAtLocal)
          const input: CreateCustomerNoteInput = {
            type: parsed.data.type,
            title: parsed.data.title.trim(),
            body: parsed.data.body.trim(),
            occurred_at: occurred,
          }
          await addCustomerNote(customerId, input)
          setTitle('')
          setBody('')
          await onAdded()
        } catch (err) {
          onError(String((err as Error).message ?? err))
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          value={type}
          onChange={(e) => setType(e.target.value as NoteType)}
        >
          {typeValues.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          type="text"
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          placeholder="Short label for this note"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Occurred at
        <input
          type="datetime-local"
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          value={occurredAtLocal}
          onChange={(e) => setOccurredAtLocal(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Body
        <textarea
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)', minHeight: 90 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={submitting}
        >
          {submitting ? 'Adding...' : 'Add note'}
        </button>
      </div>
    </form>
  )
}

