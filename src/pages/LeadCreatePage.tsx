import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import LeadForm from '../features/leads/components/LeadForm'
import { createLead, type CreateLeadInput } from '../features/leads/api/leadsApi'

export default function LeadCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(values: CreateLeadInput) {
    setError(null)
    try {
      const created = await createLead(values)
      await queryClient.invalidateQueries({ queryKey: ['leads'], exact: false })
      navigate(`/leads/${created.id}`)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs opacity-70">
          <Link to="/leads">Leads</Link> <span className="opacity-60">/</span>{' '}
          <span className="opacity-95">New lead</span>
        </div>
        <h1 className="text-2xl font-semibold mt-1">Add Lead</h1>
        <p className="text-sm opacity-80 mt-2">
          Create a new lead record. Notes you add later will update
          <span style={{ fontWeight: 600 }}> Uncontacted</span> status
          automatically.
        </p>
      </div>

      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--color-border)' }}>
        {error ? (
          <div className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>
            {error}
          </div>
        ) : null}
        <LeadForm submitLabel="Create lead" onSubmit={(v) => void onSubmit(v as any)} />
        <div className="mt-4">
          <Link
            to="/leads"
            className="text-sm font-semibold"
            style={{ color: 'var(--color-primary)' }}
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}

