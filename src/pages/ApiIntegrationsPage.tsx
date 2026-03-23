import { Link } from 'react-router-dom'
import RestApiDocsSection from '../components/RestApiDocsSection'

export default function ApiIntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs opacity-70">
          <Link to="/integrations/leads" className="hover:underline">
            Integrations
          </Link>
          <span className="opacity-60"> / </span>
          <span className="opacity-95">REST API</span>
        </div>
        <h1 className="text-2xl font-semibold mt-1">REST API integration</h1>
        <p className="text-sm opacity-80 mt-1">
          Read and update <strong>your</strong> leads and customers from your own apps using Supabase
          PostgREST. Use the sections below — each action stays collapsed until you open it.
        </p>
        <p className="text-sm opacity-70 mt-2">
          Submitting leads from a website form? Use{' '}
          <Link
            to="/integrations/leads"
            className="font-semibold text-[color:var(--color-primary)] hover:underline"
          >
            Website &amp; lead capture
          </Link>{' '}
          instead.
        </p>
      </div>

      <div
        className="rounded-xl border p-4 sm:p-6"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <RestApiDocsSection variant="embedded" />
      </div>
    </div>
  )
}
