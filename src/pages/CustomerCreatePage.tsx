import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import CrmModal from '../components/CrmModal'
import {
  createCustomer,
  findCustomersByEmailOrPhone,
  type CreateCustomerInput,
  type CustomerRow,
} from '../features/customers/api/customersApi'
import CustomerForm from '../features/customers/components/CustomerForm'

export default function CustomerCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dupBusy, setDupBusy] = useState(false)
  const [dupState, setDupState] = useState<{
    values: CreateCustomerInput
    existing: CustomerRow
  } | null>(null)

  async function tryCreate(values: CreateCustomerInput) {
    setError(null)
    const email = values.primary_email?.trim()
    if (email) {
      try {
        const found = await findCustomersByEmailOrPhone({ email, phone: null })
        if (found.length > 0) {
          setDupState({ values, existing: found[0]! })
          return
        }
      } catch (e) {
        setError(String((e as Error).message ?? e))
        return
      }
    }
    await doCreate(values)
  }

  async function doCreate(values: CreateCustomerInput) {
    setSaving(true)
    setDupBusy(true)
    setError(null)
    try {
      const created = await createCustomer(values)
      await queryClient.invalidateQueries({ queryKey: ['customers'], exact: false })
      setDupState(null)
      navigate(`/customers/${created.id}`)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setSaving(false)
      setDupBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="crm-page-header">
        <h1 className="crm-page-header-title">Add Customer</h1>
      </div>

      <div className="crm-light-surface crm-form-dark rounded-xl border border-[color:var(--color-border)] bg-white p-6 shadow-sm ring-1 ring-black/5">
        {error ? (
          <div className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>
            {error}
          </div>
        ) : null}

        <CustomerForm
          submitLabel={saving ? 'Saving...' : 'Create customer'}
          footerLeft={
            <Link
              to="/customers"
              className="crm-cancel-btn rounded-md px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </Link>
          }
          onSubmit={async (values) => {
            await tryCreate(values)
          }}
        />
      </div>

      <CrmModal
        open={dupState !== null}
        title="Customer already uses this email"
        onClose={() => {
          if (!dupBusy) setDupState(null)
        }}
      >
        <div className="space-y-4 text-slate-900">
          {dupState ? (
            <>
              <p className="text-sm m-0 leading-relaxed">
                <strong>{dupState.existing.name}</strong> is already linked to{' '}
                <span className="font-mono text-slate-700">{dupState.values.primary_email}</span>.
              </p>
              <p className="text-sm text-slate-600 m-0 leading-relaxed">
                You can open that record or create another customer anyway (for example a different
                location).
              </p>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  disabled={dupBusy}
                  onClick={() => setDupState(null)}
                >
                  Go back
                </button>
                <Link
                  to={`/customers/${dupState.existing.id}`}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 no-underline"
                  onClick={() => setDupState(null)}
                >
                  View customer
                </Link>
                <button
                  type="button"
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50"
                  disabled={dupBusy}
                  onClick={() => void doCreate(dupState.values)}
                >
                  {dupBusy ? 'Creating…' : 'Create anyway'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </CrmModal>
    </div>
  )
}
