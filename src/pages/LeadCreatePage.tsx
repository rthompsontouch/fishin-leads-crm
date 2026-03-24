import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import CrmModal from '../components/CrmModal'
import LeadForm from '../features/leads/components/LeadForm'
import {
  createLead,
  mergeLeadIntoCustomer,
  type CreateLeadInput,
} from '../features/leads/api/leadsApi'
import {
  findCustomersByEmailOrPhone,
  type CustomerRow,
} from '../features/customers/api/customersApi'

export default function LeadCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [dupBusy, setDupBusy] = useState(false)
  const [dupState, setDupState] = useState<{
    values: CreateLeadInput
    customers: CustomerRow[]
  } | null>(null)

  async function handleSubmit(values: CreateLeadInput) {
    setError(null)
    const email = values.email?.trim()
    if (email) {
      try {
        const found = await findCustomersByEmailOrPhone({ email, phone: null })
        if (found.length > 0) {
          setDupState({ values, customers: found })
          return
        }
      } catch (e) {
        setError(String((e as Error).message ?? e))
        return
      }
    }
    await finalizeLead(values)
  }

  async function finalizeLead(values: CreateLeadInput, mergeCustomerId?: string) {
    setDupBusy(true)
    setError(null)
    try {
      const created = await createLead(values)
      await queryClient.invalidateQueries({ queryKey: ['leads'], exact: false })
      if (mergeCustomerId) {
        await mergeLeadIntoCustomer(created.id, mergeCustomerId)
        await queryClient.invalidateQueries({ queryKey: ['customers'], exact: false })
        await queryClient.invalidateQueries({ queryKey: ['leads'], exact: false })
        navigate(`/customers/${mergeCustomerId}`)
      } else {
        navigate(`/leads/${created.id}`)
      }
      setDupState(null)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setDupBusy(false)
    }
  }

  const primaryMatch = dupState?.customers[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="crm-page-header">
        <h1 className="crm-page-header-title">Add Lead</h1>
      </div>

      <div className="crm-light-surface crm-form-dark rounded-xl border border-[color:var(--color-border)] bg-white p-6 shadow-sm ring-1 ring-black/5">
        {error ? (
          <div className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>
            {error}
          </div>
        ) : null}
        <LeadForm submitLabel="Create lead" onSubmit={(v) => void handleSubmit(v as CreateLeadInput)} />
        <div className="mt-4">
          <Link
            to="/leads"
            className="crm-cancel-btn rounded-md px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </Link>
        </div>
      </div>

      <CrmModal
        open={dupState !== null}
        title="This email matches a customer"
        onClose={() => {
          if (!dupBusy) setDupState(null)
        }}
      >
        <div className="space-y-4 text-slate-900">
          {primaryMatch ? (
            <>
              <p className="text-sm m-0 leading-relaxed">
                <strong>{primaryMatch.name}</strong> already uses{' '}
                <span className="font-mono text-slate-700">{dupState?.values.email}</span>.
                {dupState && dupState.customers.length > 1
                  ? ' Other customer records also match — merge uses the first listed.'
                  : null}
              </p>
              <p className="text-sm text-slate-600 m-0 leading-relaxed">
                Merge creates this lead, attaches it to that customer, and copies notes (same idea as
                merging when you win a quote).
              </p>
            </>
          ) : null}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              disabled={dupBusy}
              onClick={() => setDupState(null)}
            >
              Go back
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              disabled={dupBusy}
              onClick={() => dupState && void finalizeLead(dupState.values)}
            >
              {dupBusy ? 'Working…' : 'Create lead only'}
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50"
              disabled={dupBusy || !primaryMatch}
              onClick={() =>
                primaryMatch && dupState && void finalizeLead(dupState.values, primaryMatch.id)
              }
            >
              {dupBusy ? 'Working…' : 'Merge into customer'}
            </button>
          </div>
        </div>
      </CrmModal>
    </div>
  )
}
