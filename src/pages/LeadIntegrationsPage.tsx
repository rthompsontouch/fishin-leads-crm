import { useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import IntegrationCreateForm from '../features/integrations/components/IntegrationCreateForm'
import ApiKeyRevealModal from '../features/integrations/components/ApiKeyRevealModal'
import {
  createIntegration,
  deleteIntegration,
  getWebhookUrl,
  listIntegrations,
  regenerateIntegrationApiKey,
  type IntegrationRow,
  type CreateIntegrationInput,
} from '../features/integrations/api/integrationsApi'

export default function LeadIntegrationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const webhookUrl = getWebhookUrl()
  const { data: integrations, isPending, error } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => listIntegrations(),
  })

  const [createBusy, setCreateBusy] = useState(false)
  const [apiKeyModal, setApiKeyModal] = useState<{
    apiKey: string
    integration: IntegrationRow
  } | null>(null)
  const [regenerateTargetId, setRegenerateTargetId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  async function handleCreate(values: CreateIntegrationInput) {
    setCreateBusy(true)
    try {
      const result = await createIntegration(values)
      setApiKeyModal({
        apiKey: result.apiKey,
        integration: result.integration,
      })
      await queryClient.invalidateQueries({ queryKey: ['integrations'] })
    } finally {
      setCreateBusy(false)
    }
  }

  return (
    <div className="crm-light-surface flex flex-col gap-6">
      <div className="crm-page-header">
        <h1 className="crm-page-header-title">Website &amp; lead capture</h1>
        <Link
          to="/integrations/api"
          className="text-sm font-semibold no-underline"
          style={{ color: 'var(--color-primary)' }}
        >
          REST API
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
          style={{ borderColor: 'hsl(215 20% 88%)' }}
        >
          <div className="text-sm font-semibold mb-2" style={{ color: 'var(--crm-content-header-text)' }}>
            1) Webhook endpoint
          </div>
          <div className="text-xs text-slate-600 mb-3">
            Your marketing site will call this endpoint and include header <code className="text-xs text-slate-800">x-api-key</code>.
          </div>

          <div
            className="rounded-lg border-2 p-3 mb-3 bg-slate-50"
            style={{ borderColor: 'hsl(215 22% 72%)' }}
          >
            <div className="text-xs text-slate-600 mb-1">Webhook URL</div>
            <div
              className="break-all text-sm font-mono"
              style={{ color: 'var(--crm-content-header-text)' }}
            >
              {webhookUrl || 'Not configured'}
            </div>
          </div>

          <div className="text-sm text-slate-700">
            Example header: <span className="font-mono text-slate-800">x-api-key: {'<key>'}</span>
          </div>
        </div>

        <div
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
          style={{ borderColor: 'hsl(215 20% 88%)' }}
        >
          <div className="text-sm font-semibold mb-2" style={{ color: 'var(--crm-content-header-text)' }}>
            2) Create integration
          </div>
          <div className="text-xs text-slate-600 mb-3">
            Generates an API key (shown once). That key maps to a default status + lead source label.
          </div>

          <IntegrationCreateForm
            submitLabel={createBusy ? 'Creating...' : 'Create integration'}
            onSubmit={(v) => void handleCreate(v)}
          />
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5"
        style={{ borderColor: 'hsl(215 20% 88%)' }}
      >
        <div
          className="hidden md:grid md:grid-cols-6 p-3 text-xs font-semibold border-b bg-slate-100"
          style={{ borderColor: 'hsl(215 20% 88%)', color: 'var(--crm-content-header-text)' }}
        >
          <div className="col-span-2">Integration</div>
          <div>Source label</div>
          <div>Default status</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        <div
          className="md:hidden px-3 py-2 text-xs font-semibold border-b bg-slate-100 text-slate-700"
          style={{ borderColor: 'hsl(215 20% 88%)' }}
        >
          Your integrations
        </div>

        {isPending ? (
          <div className="p-6 text-sm text-slate-600">Loading integrations...</div>
        ) : error ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load integrations. {String((error as Error).message)}
          </div>
        ) : !integrations || integrations.length === 0 ? (
          <div className="p-6">
            <div className="text-sm text-slate-700">No integrations yet.</div>
            <div className="text-xs text-slate-600 mt-1">Create one using the form above.</div>
          </div>
        ) : (
          <div className="flex flex-col">
            {integrations.map((i) => (
              <div
                key={i.id}
                className="border-b last:border-b-0"
                style={{ borderColor: 'hsl(215 20% 88%)' }}
              >
                {/* Mobile: name + actions only */}
                <div className="md:hidden flex items-center gap-2 p-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left text-sm font-semibold text-slate-900 truncate rounded-md -m-1 p-1 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                    onClick={() => navigate(`/integrations/leads/${i.id}`)}
                  >
                    {i.name}
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      title="Regenerate API key"
                      className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-semibold border-2 transition-colors duration-150 bg-white hover:bg-slate-50 text-slate-800"
                      style={{ borderColor: 'hsl(215 22% 72%)' }}
                      onClick={() => setRegenerateTargetId(i.id)}
                    >
                      New key
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-semibold border-2 border-transparent bg-transparent text-[color:var(--color-danger)] hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors duration-150"
                      onClick={() => setDeleteTargetId(i.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Desktop: full table row */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`View integration ${i.name}`}
                  className="hidden md:grid md:grid-cols-6 md:items-center p-3 cursor-pointer transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-primary)]"
                  style={{ color: 'var(--crm-content-header-text)' }}
                  onClick={() => navigate(`/integrations/leads/${i.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/integrations/leads/${i.id}`)
                    }
                  }}
                >
                  <div className="col-span-2">
                    <div className="text-sm font-semibold">{i.name}</div>
                    <div className="text-xs text-slate-500">
                      Created {new Date(i.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 truncate">{i.source_label}</div>
                  <div className="text-sm text-slate-700 truncate">{i.default_status}</div>
                  <div className="text-sm">
                    {i.enabled ? (
                      <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Enabled</span>
                    ) : (
                      <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>Disabled</span>
                    )}
                  </div>
                  <div
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold border-2 transition-colors duration-150 bg-white hover:bg-slate-50"
                        style={{
                          color: 'var(--crm-content-header-text)',
                          borderColor: 'hsl(215 22% 72%)',
                        }}
                        onClick={() => setRegenerateTargetId(i.id)}
                      >
                        Regenerate key
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold border-2 border-transparent bg-transparent text-[color:var(--color-danger)] hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors duration-150"
                        onClick={() => setDeleteTargetId(i.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {apiKeyModal ? (
        <ApiKeyRevealModal
          apiKey={apiKeyModal.apiKey}
          webhookUrl={webhookUrl}
          onClose={() => setApiKeyModal(null)}
        />
      ) : null}

      <ConfirmDialog
        open={regenerateTargetId !== null}
        onClose={() => setRegenerateTargetId(null)}
        variant="primary"
        title="Regenerate API key?"
        confirmLabel="Regenerate key"
        description="Your website integrations must be updated with the new key. The new key will be shown once."
        onConfirm={async () => {
          if (!regenerateTargetId) return
          const result = await regenerateIntegrationApiKey(regenerateTargetId)
          setApiKeyModal({
            apiKey: result.apiKey,
            integration: result.integration,
          })
          await queryClient.invalidateQueries({ queryKey: ['integrations'] })
        }}
      />

      <ConfirmDialog
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Delete integration?"
        description="Website forms using this key will stop creating leads until you add a new integration."
        onConfirm={async () => {
          if (!deleteTargetId) return
          await deleteIntegration(deleteTargetId)
          await queryClient.invalidateQueries({ queryKey: ['integrations'] })
        }}
      />
    </div>
  )
}
