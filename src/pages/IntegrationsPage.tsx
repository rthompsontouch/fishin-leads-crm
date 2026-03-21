import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function IntegrationsPage() {
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

  async function handleRegenerate(id: string) {
    const ok = window.confirm(
      'Regenerate API key? Your website integrations must be updated with the new key.',
    )
    if (!ok) return

    const result = await regenerateIntegrationApiKey(id)
    setApiKeyModal({
      apiKey: result.apiKey,
      integration: result.integration,
    })
    await queryClient.invalidateQueries({ queryKey: ['integrations'] })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm opacity-80 mt-1">
          Create secure API keys for your website forms. Leads will be inserted into your
          CRM automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-semibold mb-2">1) Webhook endpoint</div>
          <div className="text-xs opacity-70 mb-3">
            Your marketing site will call this endpoint and include header `x-api-key`.
          </div>

          <div className="rounded-lg border p-3 mb-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}>
            <div className="text-xs opacity-70 mb-1">Webhook URL</div>
            <div className="break-all text-sm font-mono">{webhookUrl || 'Not configured'}</div>
          </div>

          <div className="text-sm opacity-80">
            Example header: <span className="font-mono">x-api-key: {'<key>'}</span>
          </div>
        </div>

        <div className="rounded-xl border p-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-semibold mb-2">2) Create integration</div>
          <div className="text-xs opacity-70 mb-3">
            Generates an API key (shown once). That key maps to a default status + lead source label.
          </div>

          <IntegrationCreateForm
            submitLabel={createBusy ? 'Creating...' : 'Create integration'}
            onSubmit={(v) => void handleCreate(v)}
          />
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="grid grid-cols-6 bg-[color:var(--color-surface-1)] p-3 text-xs font-semibold">
          <div className="col-span-2">Integration</div>
          <div>Source label</div>
          <div>Default status</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {isPending ? (
          <div className="p-6 text-sm opacity-80">Loading integrations...</div>
        ) : error ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load integrations. {String((error as Error).message)}
          </div>
        ) : !integrations || integrations.length === 0 ? (
          <div className="p-6">
            <div className="text-sm opacity-80">No integrations yet.</div>
            <div className="text-xs opacity-70 mt-1">Create one using the form above.</div>
          </div>
        ) : (
          <div className="flex flex-col">
            {integrations.map((i) => (
              <div
                key={i.id}
                role="button"
                tabIndex={0}
                aria-label={`View integration ${i.name}`}
                className="grid grid-cols-6 items-center p-3 border-b cursor-pointer transition-colors duration-150 hover:bg-[color:var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-primary)]"
                style={{ borderColor: 'var(--color-border)' }}
                onClick={() => navigate(`/integrations/${i.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/integrations/${i.id}`)
                  }
                }}
              >
                <div className="col-span-2">
                  <div className="text-sm font-semibold">{i.name}</div>
                  <div className="text-xs opacity-70">Created {new Date(i.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-sm opacity-90 truncate">{i.source_label}</div>
                <div className="text-sm opacity-90 truncate">{i.default_status}</div>
                <div className="text-sm opacity-90">
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
                      className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold border transition-colors duration-150 border-[color:var(--color-border)] bg-transparent hover:bg-[color:var(--color-surface-2)]"
                      onClick={() => void handleRegenerate(i.id)}
                    >
                      Regenerate key
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold border border-transparent bg-transparent text-[color:var(--color-danger)] hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors duration-150"
                      onClick={async () => {
                        const ok = window.confirm('Delete this integration?')
                        if (!ok) return
                        await deleteIntegration(i.id)
                        await queryClient.invalidateQueries({ queryKey: ['integrations'] })
                      }}
                    >
                      Delete
                    </button>
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
    </div>
  )
}

