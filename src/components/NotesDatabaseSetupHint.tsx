import { NOTES_TITLE_MIGRATION_SQL } from '../lib/noteDbCompat'

export function shouldShowNotesTitleSetupHint(message: string): boolean {
  return /does not exist/i.test(message) && /\btitle\b/i.test(message)
}

export default function NotesDatabaseSetupHint({ errorMessage }: { errorMessage: string }) {
  if (!shouldShowNotesTitleSetupHint(errorMessage)) return null

  return (
    <div
      className="rounded-lg border p-4 text-sm space-y-2"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-surface-2)',
        color: 'var(--color-foreground)',
      }}
    >
      <p className="font-semibold">Database needs a quick update</p>
      <p className="opacity-90 leading-snug">
        Your Supabase project doesn’t have the <code className="text-xs px-1 rounded bg-black/10">title</code>{' '}
        column on note tables yet. Open{' '}
        <strong>Supabase → SQL Editor</strong>, paste the script below, then click <strong>Run</strong>.
      </p>
      <pre
        className="text-xs p-3 rounded-md overflow-x-auto whitespace-pre-wrap border"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-background)',
          color: 'var(--color-foreground)',
        }}
      >
        {NOTES_TITLE_MIGRATION_SQL}
      </pre>
      <p className="text-xs opacity-75">
        Or from the project folder: <code className="text-xs">supabase db push</code> (if you use the Supabase CLI).
      </p>
    </div>
  )
}
