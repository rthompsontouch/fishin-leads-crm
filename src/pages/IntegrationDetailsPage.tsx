import { useEffect, useMemo, useState } from 'react'
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

  useEffect(() => {
    setRevealedKey(null)
  }, [safeId])

  async function handleRegenerate(id: string) {
    const ok = window.confirm(
      'Regenerate API key? Your website integrations must be updated with the new key.',
    )
    if (!ok) return

    const result = await regenerateIntegrationApiKey(id)
    setRevealedKey(result.apiKey)
    await queryClient.invalidateQueries({ queryKey: ['integrations'] })
    await queryClient.invalidateQueries({ queryKey: ['integration', safeId] })
  }

  if (!safeId || !isValidUuid) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
          Invalid integration link.
        </div>
        <Link to="/integrations/leads" className="text-sm font-semibold underline w-fit">
          Back to website &amp; leads
        </Link>
      </div>
    )
  }

  if (isPending) {
    return <div className="text-sm opacity-80">Loading integration...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
          {String((error as Error).message)}
        </div>
        <Link to="/integrations/leads" className="text-sm font-semibold underline w-fit">
          Back to website &amp; leads
        </Link>
      </div>
    )
  }

  if (!integration) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm opacity-80">Integration not found.</div>
        <Link to="/integrations/leads" className="text-sm font-semibold underline w-fit">
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
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs opacity-70">
            <span className="opacity-80">Integrations</span>
            <span className="opacity-60"> / </span>
            <Link to="/integrations/leads" className="hover:underline">
              Website &amp; leads
            </Link>
            <span className="opacity-60"> / </span>
            <span className="opacity-95">{integration.name}</span>
          </div>
          <h1 className="text-2xl font-semibold mt-1">{integration.name}</h1>
          <p className="text-sm opacity-80 mt-2">
            Webhook setup, source label, and default lead status for this integration.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold border transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
            onClick={() => void handleRegenerate(integration.id)}
          >
            Regenerate key
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold border transition-colors duration-150 border-transparent bg-transparent text-[color:var(--color-danger)] hover:bg-red-600 hover:border-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            onClick={async () => {
              const ok = window.confirm('Delete this integration?')
              if (!ok) return
              await deleteIntegration(integration.id)
              await queryClient.invalidateQueries({ queryKey: ['integrations'] })
              navigate('/integrations/leads')
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div
        className="rounded-xl border p-5 max-w-2xl"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="text-sm font-semibold mb-3">Details</div>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs opacity-70 uppercase tracking-wide">Source label</dt>
            <dd className="mt-0.5 font-medium">{integration.source_label}</dd>
          </div>
          <div>
            <dt className="text-xs opacity-70 uppercase tracking-wide">Default lead status</dt>
            <dd className="mt-0.5 font-medium">{integration.default_status}</dd>
          </div>
          <div>
            <dt className="text-xs opacity-70 uppercase tracking-wide">Status</dt>
            <dd className="mt-0.5 font-medium">
              {integration.enabled ? (
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Enabled</span>
              ) : (
                <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>Disabled</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs opacity-70 uppercase tracking-wide">Created</dt>
            <dd className="mt-0.5 font-medium">
              {new Date(integration.created_at).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <section
        className="rounded-xl border p-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-lg font-semibold mb-1">Website form / webhook</h2>
        <p className="text-sm opacity-80 mb-6">
          Send <span className="font-semibold">POST</span> requests with header{' '}
          <span className="font-mono text-xs">x-api-key</span>. The API key is only shown when you
          create or regenerate an integration.
        </p>

        <div
          className="rounded-lg border p-4 mb-6"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div className="text-xs opacity-70 mb-2">Webhook URL</div>
          <div className="break-all text-sm font-mono">{webhookUrl || 'Not configured'}</div>
        </div>

        <div
          className="rounded-lg border p-4 mb-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs opacity-70">API key</div>
            {revealedKey ? (
              <button
                type="button"
                className="text-xs font-semibold underline cursor-pointer opacity-80 hover:opacity-100"
                onClick={() => setRevealedKey(null)}
              >
                Hide key
              </button>
            ) : null}
          </div>
          {revealedKey ? (
            <div className="break-all text-sm font-mono">{revealedKey}</div>
          ) : (
            <p className="text-sm opacity-85">
              Your key is stored securely and isn&apos;t shown here. Use <strong>Regenerate key</strong>{' '}
              above to create a new key (shown once).
            </p>
          )}
        </div>

        <div className="text-sm opacity-80 mb-4">
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
          className="rounded-lg border p-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div className="text-xs opacity-70 mb-2">Example JSON</div>
          <pre className="text-xs whitespace-pre-wrap overflow-auto m-0">{exampleJson}</pre>
        </div>
      </section>
    </div>
  )
}
