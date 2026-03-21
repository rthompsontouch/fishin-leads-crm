import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './app/AppShell'
import RequireAuth from './auth/RequireAuth'
import CustomersPage from './pages/CustomersPage'
import DashboardPage from './pages/DashboardPage'
import IntegrationDetailsPage from './pages/IntegrationDetailsPage'
import IntegrationsPage from './pages/IntegrationsPage'
import LeadsPage from './pages/LeadsPage'
import LoginPage from './pages/LoginPage'
import LeadDetailsPage from './pages/LeadDetailsPage'
import LeadCreatePage from './pages/LeadCreatePage'
import LeadNotePage from './pages/LeadNotePage'
import CustomerCreatePage from './pages/CustomerCreatePage'
import CustomerDetailsPage from './pages/CustomerDetailsPage'
import CustomerNotePage from './pages/CustomerNotePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
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
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="integrations/:integrationId" element={<IntegrationDetailsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
