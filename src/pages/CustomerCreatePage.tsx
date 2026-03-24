import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { createCustomer, type CreateCustomerInput } from '../features/customers/api/customersApi'
import CustomerForm from '../features/customers/components/CustomerForm'

export default function CustomerCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(values: CreateCustomerInput) {
    setError(null)
    setSaving(true)
    try {
      const created = await createCustomer(values)
      await queryClient.invalidateQueries({ queryKey: ['customers'], exact: false })
      navigate(`/customers/${created.id}`)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="crm-page-header">
        <h1 className="crm-page-header-title">Add Customer</h1>
      </div>

      <div
        className="crm-light-surface crm-form-dark rounded-xl border border-[color:var(--color-border)] bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        {error ? (
          <div className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>
            {error}
          </div>
        ) : null}

        <CustomerForm
          submitLabel={saving ? 'Saving...' : 'Create customer'}
          onSubmit={async (values) => {
            await onSubmit(values)
          }}
        />

        <div className="mt-4">
          <Link
            to="/customers"
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

