import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteIntegration,
  getIntegrationById,
  getWebhookUrl,
  regenerateIntegrationApiKey,
} from '../features/integrations/api/integrationsApi'

export default function IntegrationDetailsPage() {
  const { integrationId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const webhookUrl = getWebhookUrl()

  const safeId = useMemo(() => (integrationId ? String(integrationId) : ''), [integrationId])
  const isValidUuid = useMemo(
    () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeId),
    [safeId],
  )

  const {
    data: integration,
    isPending,
    error,
  } = useQuery({
    queryKey: ['integration', safeId],
    queryFn: () => getIntegrationById(safeId),
    enabled: Boolean(safeId) && isValidUuid,
  })

  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [confirmRegenerateKey, setConfirmRegenerateKey] = useState(false)
  const [confirmDeleteIntegration, setConfirmDeleteIntegration] = useState(false)

  useEffect(() => {
    setRevealedKey(null)
  }, [safeId])

  const backLinkClass = 'text-sm font-semibold w-fit underline-offset-2 hover:underline'
  const backLinkStyle = { color: 'var(--color-primary)' } as const

  if (!safeId || !isValidUuid) {
    return (
      <div className="crm-light-surface flex flex-col gap-4">
        <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
          Invalid integration link.
        </div>
        <Link to="/integrations/leads" className={backLinkClass} style={backLinkStyle}>
          Back to website &amp; leads
        </Link>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="crm-light-surface">
        <div className="text-sm text-slate-600">Loading integration...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="crm-light-surface flex flex-col gap-4">
        <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
          {String((error as Error).message)}
        </div>
        <Link to="/integrations/leads" className={backLinkClass} style={backLinkStyle}>
          Back to website &amp; leads
        </Link>
      </div>
    )
  }

  if (!integration) {
    return (
      <div className="crm-light-surface flex flex-col gap-4">
        <div className="text-sm text-slate-700">Integration not found.</div>
        <Link to="/integrations/leads" className={backLinkClass} style={backLinkStyle}>
          Back to website &amp; leads
        </Link>
      </div>
    )
  }

  const exampleJson = `{
  "first_name": "Jane",
  "last_name": "Doe",
  "company": "Acme Inc",
  "industry": "Real Estate",
  "company_size": "51-200",
  "website": "https://acme.example",
  "email": "jane@acme.example",
  "phone": "+1 555-123-4567"
}`

  return (
    <div className="crm-light-surface flex flex-col gap-6">
      <div className="crm-page-header">
        <h1 className="crm-page-header-title">{integration.name}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold border-2 transition-colors duration-150 bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
            style={{
              color: 'var(--crm-content-header-text)',
              borderColor: 'hsl(215 22% 72%)',
            }}
            onClick={() => setConfirmRegenerateKey(true)}
          >
            Regenerate key
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold border transition-colors duration-150 border-transparent bg-transparent text-[color:var(--color-danger)] hover:bg-red-600 hover:border-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            onClick={() => setConfirmDeleteIntegration(true)}
          >
            Delete
          </button>
        </div>
      </div>

      <div
        className="rounded-xl bg-white p-5 max-w-2xl shadow-sm ring-1 ring-black/5"
        style={{ borderColor: 'hsl(215 20% 88%)' }}
      >
        <div className="text-sm font-semibold mb-3" style={{ color: 'var(--crm-content-header-text)' }}>
          Details
        </div>
        <dl className="grid gap-3 text-sm" style={{ color: 'var(--crm-content-header-text)' }}>
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wide">Source label</dt>
            <dd className="mt-0.5 font-medium">{integration.source_label}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wide">Default lead status</dt>
            <dd className="mt-0.5 font-medium">{integration.default_status}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wide">Status</dt>
            <dd className="mt-0.5 font-medium">
              {integration.enabled ? (
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Enabled</span>
              ) : (
                <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>Disabled</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wide">Created</dt>
            <dd className="mt-0.5 font-medium">
              {new Date(integration.created_at).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <section
        className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
        style={{ color: 'var(--crm-content-header-text)' }}
      >
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--crm-content-header-text)' }}>
          Website form / webhook
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Send <span className="font-semibold text-slate-800">POST</span> requests with header{' '}
          <span className="font-mono text-xs text-slate-800">x-api-key</span>. The API key is only shown when you
          create or regenerate an integration.
        </p>

        <div
          className="rounded-lg border-2 p-4 mb-6 bg-slate-50"
          style={{ borderColor: 'hsl(215 22% 72%)' }}
        >
          <div className="text-xs text-slate-600 mb-2">Webhook URL</div>
          <div className="break-all text-sm font-mono text-slate-800">
            {webhookUrl || 'Not configured'}
          </div>
        </div>

        <div
          className="rounded-lg border-2 p-4 mb-4 bg-slate-50"
          style={{ borderColor: 'hsl(215 22% 72%)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs text-slate-600">API key</div>
            {revealedKey ? (
              <button
                type="button"
                className="text-xs font-semibold underline cursor-pointer text-slate-700 hover:text-slate-900"
                onClick={() => setRevealedKey(null)}
              >
                Hide key
              </button>
            ) : null}
          </div>
          {revealedKey ? (
            <div className="break-all text-sm font-mono text-slate-900">{revealedKey}</div>
          ) : (
            <p className="text-sm text-slate-700">
              Your key is stored securely and isn&apos;t shown here. Use <strong>Regenerate key</strong>{' '}
              above to create a new key (shown once).
            </p>
          )}
        </div>

        <div className="text-sm text-slate-700 mb-4">
          Include in your request:
          <ul className="list-disc ml-5 mt-2">
            <li>
              Header: <span className="font-mono">x-api-key: &lt;your key&gt;</span>
            </li>
            <li>
              JSON body with lead fields (first/last name, company, email, phone, industry,
              company_size, website).
            </li>
          </ul>
        </div>

        <div
          className="rounded-lg border-2 p-4 bg-slate-50"
          style={{ borderColor: 'hsl(215 22% 72%)' }}
        >
          <div className="text-xs text-slate-600 mb-2">Example JSON</div>
          <pre className="text-xs whitespace-pre-wrap overflow-auto m-0 text-slate-800 font-mono">
            {exampleJson}
          </pre>
        </div>
      </section>

      <ConfirmDialog
        open={confirmRegenerateKey}
        onClose={() => setConfirmRegenerateKey(false)}
        variant="primary"
        title="Regenerate API key?"
        confirmLabel="Regenerate key"
        description="Your website integrations must be updated with the new key. The new key will be shown once."
        onConfirm={async () => {
          const result = await regenerateIntegrationApiKey(integration.id)
          setRevealedKey(result.apiKey)
          await queryClient.invalidateQueries({ queryKey: ['integrations'] })
          await queryClient.invalidateQueries({ queryKey: ['integration', safeId] })
        }}
      />

      <ConfirmDialog
        open={confirmDeleteIntegration}
        onClose={() => setConfirmDeleteIntegration(false)}
        title="Delete integration?"
        description={
          <>
            Remove <strong>{integration.name}</strong>? Website forms using this key will stop
            creating leads until you create a new integration.
          </>
        }
        onConfirm={async () => {
          await deleteIntegration(integration.id)
          await queryClient.invalidateQueries({ queryKey: ['integrations'] })
          navigate('/integrations/leads')
        }}
      />
    </div>
  )
}
