import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './assets/brand/registerBrandHead'
import './index.css'
import App from './App.tsx'
import { AppMessagesProvider } from './context/AppMessagesContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppMessagesProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppMessagesProvider>
    </QueryClientProvider>
  </StrictMode>,
)
