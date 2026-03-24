import { useCallback, useState, type ReactNode } from 'react'
import { BookOpen, ChevronDown, ClipboardCheck, Code2 } from 'lucide-react'

const mono = 'text-xs font-mono break-all whitespace-pre-wrap'

const detailsClass = 'rounded-xl border-2 overflow-hidden group border-[hsl(215_22%_72%)]'
const summaryClass =
  'cursor-pointer list-none px-3 py-3 flex items-center justify-between gap-2 text-sm font-semibold transition-colors hover:bg-slate-200/80 [&::-webkit-details-marker]:hidden bg-slate-100 text-slate-800'

function OpenDocsPanel({
  title,
  children,
  variant = 'default',
}: {
  title: string
  children: ReactNode
  variant?: 'default' | 'warning'
}) {
  const border =
    variant === 'warning' ? 'var(--color-warning)' : 'var(--color-border)'
  const bg =
    variant === 'warning'
      ? 'color-mix(in srgb, var(--color-warning) 8%, transparent)'
      : 'transparent'

  return (
    <div
      className="rounded-lg border-2 p-4 text-sm space-y-2 bg-white"
      style={{ borderColor: border, background: variant === 'warning' ? bg : '#fff' }}
    >
      <div className="font-semibold" style={{ color: 'var(--crm-content-header-text, #0f172a)' }}>
        {title}
      </div>
      <div className="text-slate-700">{children}</div>
    </div>
  )
}

function CollapsibleCodeExample({
  title,
  description,
  code,
}: {
  title: string
  code: string
  description?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.alert('Could not copy to clipboard.')
    }
  }, [code])

  return (
    <details className={detailsClass}>
      <summary className={summaryClass}>
        <span className="truncate min-w-0 flex-1 text-left">{title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void copy()
            }}
            className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border-2 cursor-pointer transition-colors bg-white border-[hsl(215_22%_72%)] text-slate-800 hover:bg-slate-100"
          >
            {copied ? <ClipboardCheck size={14} aria-hidden /> : <Code2 size={14} aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <ChevronDown
            size={18}
            className="shrink-0 text-slate-600 transition-transform duration-200 group-open:rotate-180 pointer-events-none"
            aria-hidden
          />
        </div>
      </summary>
      <div className="border-t border-[hsl(215_22%_88%)] bg-white">
        {description ? (
          <div className="text-xs text-slate-600 px-3 py-2 border-b border-[hsl(215_22%_88%)]">
            {description}
          </div>
        ) : null}
        <pre
          className={`${mono} p-3 max-h-64 overflow-auto crm-scrollbar m-0 bg-slate-50 text-slate-900`}
        >
          {code}
        </pre>
      </div>
    </details>
  )
}

type RestApiDocsVariant = 'card' | 'embedded'

export default function RestApiDocsSection({ variant = 'card' }: { variant?: RestApiDocsVariant }) {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const baseExample = (rawUrl?.replace(/\/$/, '') || 'https://YOUR_PROJECT.supabase.co') + '/rest/v1'

  const listCustomers = `curl -s "${baseExample}/customers?select=*&order=created_at.desc" \\
  -H "apikey: YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY" \\
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \\
  -H "Accept: application/json"`

  const getCustomer = `curl -s "${baseExample}/customers?id=eq.CUSTOMER_UUID&select=*" \\
  -H "apikey: YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY" \\
  -H "Authorization: Bearer USER_ACCESS_TOKEN"`

  const patchCustomer = `curl -s -X PATCH "${baseExample}/customers?id=eq.CUSTOMER_UUID" \\
  -H "apikey: YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY" \\
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{"name":"Updated Company","status":"Active","primary_email":"you@example.com"}'`

  const listLeads = `curl -s "${baseExample}/leads?select=*&order=created_at.desc" \\
  -H "apikey: YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY" \\
  -H "Authorization: Bearer USER_ACCESS_TOKEN"`

  const patchLead = `curl -s -X PATCH "${baseExample}/leads?id=eq.LEAD_UUID" \\
  -H "apikey: YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY" \\
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{"status":"Quoted","company":"Acme Inc"}'`

  const insertLeadNote = `curl -s -X POST "${baseExample}/lead_notes" \\
  -H "apikey: YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY" \\
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{"owner_id":"YOUR_AUTH_USER_ID","lead_id":"LEAD_UUID","type":"note","title":"From API","body":"Note text"}'

# owner_id must match JWT "sub" (your auth user id). Max 5 notes per lead.`

  const jsList = `const res = await fetch(\`${baseExample}/customers?select=*\`, {
  headers: {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: \`Bearer \${session.access_token}\`,
  },
})
const customers = await res.json()`

  const body = (
    <>
      {variant === 'card' ? (
        <div className="flex items-start gap-3">
          <BookOpen className="shrink-0 mt-0.5 text-amber-500" size={22} />
          <div style={{ color: 'var(--crm-content-header-text, #0f172a)' }}>
            <h2 className="text-lg font-semibold">REST API (build your own app)</h2>
            <p className="text-sm text-slate-600 mt-1">
              This CRM runs on <strong className="text-slate-800">Supabase</strong>. Your data is available through the standard{' '}
              <strong className="text-slate-800">PostgREST</strong> API at{' '}
              <code className="text-xs text-slate-800">{baseExample}</code>
              {rawUrl ? '' : ' (set VITE_SUPABASE_URL in .env to show your project URL here).'}
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Security and headers stay visible; each API example below is collapsed until you open it.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1" style={{ color: 'var(--crm-content-header-text, #0f172a)' }}>
          <p className="text-sm text-slate-700">
            Base URL: <code className="text-xs break-all text-slate-900">{baseExample}</code>
          </p>
          <p className="text-xs text-slate-600">
            Security and headers are always shown. Expand an API example for notes and copy-paste code.
          </p>
        </div>
      )}

      <OpenDocsPanel title="Security checklist" variant="warning">
        <ul className="list-disc pl-5 space-y-1 text-sm m-0 text-slate-800">
          <li>
            Use the <strong>publishable (anon) key</strong> in mobile/web clients — never the{' '}
            <strong>service_role</strong> key in a browser or untrusted app.
          </li>
          <li>
            Send <code className="text-xs">Authorization: Bearer &lt;user_access_token&gt;</code> from{' '}
            <strong>Supabase Auth</strong> so Row Level Security applies (users only see their own rows).
          </li>
          <li>
            On a <strong>trusted server</strong>, you can use the service role to bypass RLS — store that key
            only in server secrets.
          </li>
        </ul>
      </OpenDocsPanel>

      <OpenDocsPanel title="Required headers & documentation links">
        <ul className="list-disc pl-5 space-y-1 text-sm m-0 text-slate-800">
          <li>
            <code className="text-xs">apikey: &lt;VITE_SUPABASE_PUBLISHABLE_KEY&gt;</code> (same as anon key)
          </li>
          <li>
            <code className="text-xs">Authorization: Bearer &lt;user JWT&gt;</code> after sign-in
          </li>
        </ul>
        <p className="text-xs text-slate-600 m-0 mt-2">
          Docs:{' '}
          <a
            href="https://supabase.com/docs/guides/api"
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--color-primary)] underline"
          >
            Supabase REST API
          </a>
          {' · '}
          <a
            href="https://postgrest.org/en/stable/references/api/tables_views.html"
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--color-primary)] underline"
          >
            PostgREST filters &amp; operators
          </a>
        </p>
      </OpenDocsPanel>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-0.5">
          API examples
        </h3>
        <div className="flex flex-col gap-2">
          <CollapsibleCodeExample
            title="List customers"
            description="Returns rows you own (RLS). Add &limit=50, &offset=0 for paging."
            code={listCustomers}
          />
          <CollapsibleCodeExample
            title="Get one customer by id"
            description="Replace CUSTOMER_UUID with the record id from the CRM URL."
            code={getCustomer}
          />
          <CollapsibleCodeExample
            title="Update a customer (PATCH)"
            description="Only include columns you want to change. Prefer return=representation returns the row."
            code={patchCustomer}
          />
          <CollapsibleCodeExample
            title="List leads"
            description="Same pattern as customers; order=created_at.desc for newest first."
            code={listLeads}
          />
          <CollapsibleCodeExample
            title="Update a lead (PATCH)"
            description="Common fields: status, company, email, phone, first_name, last_name, …"
            code={patchLead}
          />
          <CollapsibleCodeExample
            title="Insert a lead note (POST)"
            description="Requires lead_id, type, title, body. Respects your 5-notes-per-lead limit."
            code={insertLeadNote}
          />
          <CollapsibleCodeExample
            title="JavaScript — list customers with session (fetch)"
            description="Use @supabase/supabase-js instead for auth refresh & realtime; this shows the raw REST shape."
            code={jsList}
          />
        </div>
      </div>

      <OpenDocsPanel title="Tables & filter cheat sheet">
        <p className="text-xs text-slate-800 m-0">
          Main tables: <code className="text-xs">customers</code>, <code className="text-xs">leads</code>,{' '}
          <code className="text-xs">customer_notes</code>, <code className="text-xs">lead_notes</code>,{' '}
          <code className="text-xs">service_entries</code>. Column names match your database (see Supabase
          Table Editor). Filters use <code className="text-xs">column=eq.value</code>,{' '}
          <code className="text-xs">column=ilike.*term*</code>, etc.
        </p>
      </OpenDocsPanel>
    </>
  )

  if (variant === 'embedded') {
    return <div className="space-y-4 px-0 sm:px-1 pb-2">{body}</div>
  }

  return (
    <div className="rounded-xl border-2 border-[hsl(215_22%_72%)] bg-white p-6 space-y-4 shadow-sm ring-1 ring-black/5">
      {body}
    </div>
  )
}
