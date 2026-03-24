import { Link } from 'react-router-dom'
import RestApiDocsSection from '../components/RestApiDocsSection'

export default function ApiIntegrationsPage() {
  return (
    <div className="crm-light-surface flex flex-col gap-6">
      <div className="crm-page-header">
        <h1 className="crm-page-header-title">REST API integration</h1>
        <Link
          to="/integrations/leads"
          className="text-sm font-semibold no-underline"
          style={{ color: 'var(--color-primary)' }}
        >
          Website &amp; leads
        </Link>
      </div>

      <RestApiDocsSection variant="embedded" />
    </div>
  )
}
