import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import AppShell from './app/AppShell'
import RequireAuth from './auth/RequireAuth'
import OnboardingGate from './auth/OnboardingGate'
import CustomersPage from './pages/CustomersPage'
import DashboardPage from './pages/DashboardPage'
import IntegrationDetailsPage from './pages/IntegrationDetailsPage'
import LeadIntegrationsPage from './pages/LeadIntegrationsPage'
import ApiIntegrationsPage from './pages/ApiIntegrationsPage'
import LeadsPage from './pages/LeadsPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import UpdatePasswordPage from './pages/UpdatePasswordPage'
import LeadDetailsPage from './pages/LeadDetailsPage'
import LeadCreatePage from './pages/LeadCreatePage'
import LeadNotePage from './pages/LeadNotePage'
import CustomerCreatePage from './pages/CustomerCreatePage'
import CustomerDetailsPage from './pages/CustomerDetailsPage'
import CustomerNotePage from './pages/CustomerNotePage'
import JobDetailsPage from './pages/JobDetailsPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'

function LegacyIntegrationsPathRedirect() {
  const { legacyId } = useParams()
  const id = legacyId ?? ''
  if (id === 'api') return <Navigate to="/integrations/api" replace />
  if (id === 'leads') return <Navigate to="/integrations/leads" replace />
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return <Navigate to={`/integrations/leads/${id}`} replace />
  }
  return <Navigate to="/integrations/leads" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/update-password" element={<UpdatePasswordPage />} />

      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <OnboardingGate>
              <AppShell />
            </OnboardingGate>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/new" element={<LeadCreatePage />} />
        <Route path="leads/:leadId/notes/:noteId" element={<LeadNotePage />} />
        <Route path="leads/:leadId" element={<LeadDetailsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/new" element={<CustomerCreatePage />} />
        <Route path="customers/:customerId/notes/:noteId" element={<CustomerNotePage />} />
        <Route path="customers/:customerId" element={<CustomerDetailsPage />} />
        <Route path="jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="integrations" element={<Navigate to="/integrations/leads" replace />} />
        <Route path="integrations/leads" element={<LeadIntegrationsPage />} />
        <Route path="integrations/leads/:integrationId" element={<IntegrationDetailsPage />} />
        <Route path="integrations/api" element={<ApiIntegrationsPage />} />
        <Route path="integrations/:legacyId" element={<LegacyIntegrationsPathRedirect />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
