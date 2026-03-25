import { useEffect, useState } from 'react'
import ModalScrollBackdrop from '../../../components/ModalScrollBackdrop'

const WEBHOOK_TEST_TIMEOUT_MS = 20_000

export default function ApiKeyRevealModal({
  apiKey,
  onClose,
  webhookUrl,
}: {
  apiKey: string
  onClose: () => void
  webhookUrl: string
}) {
  const [copied, setCopied] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    setCopied(false)
  }, [apiKey])

  async function copy() {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  async function testWebhook() {
    if (!webhookUrl.trim()) {
      setTestResult('Webhook URL is not configured. Set VITE_SUPABASE_URL (or VITE_WEBSITE_LEAD_CAPTURE_URL) so the app knows where to POST.')
      return
    }

    setTesting(true)
    setTestResult(null)
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), WEBHOOK_TEST_TIMEOUT_MS)
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          first_name: 'Jane',
          last_name: 'Doe',
          company: 'Acme Inc',
          industry: 'Real Estate',
          company_size: '51-200',
          website: 'https://acme.example',
          email: 'jane@acme.example',
          phone: '+1 555-123-4567',
        }),
      })

      const text = await resp.text()
      setTestResult(`HTTP ${resp.status}\n\n${text}`)
    } catch (e) {
      const err = e as Error
      if (err.name === 'AbortError') {
        setTestResult(
          `Request timed out after ${WEBHOOK_TEST_TIMEOUT_MS / 1000}s. The server may be slow, blocking browser requests (CORS), or unreachable.`,
        )
      } else {
        setTestResult(
          err.message ||
            String(e) ||
            'Request failed. If you see “Failed to fetch”, the browser blocked the request (often CORS or mixed content).',
        )
      }
    } finally {
      window.clearTimeout(timeoutId)
      setTesting(false)
    }
  }

  return (
    <ModalScrollBackdrop onBackdropClose={onClose} zClass="z-50" role="dialog" aria-modal>
      <div
        className="crm-modal-panel-mobile-fs my-4 w-full max-w-[min(720px,100%)] max-h-[min(92dvh,880px)] min-h-0 flex flex-col rounded-xl border border-slate-200/90 bg-white text-slate-900 shadow-lg overflow-hidden ring-1 ring-black/5 [color-scheme:light]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-4 p-5 pb-0">
          <div>
            <div className="text-sm font-medium text-slate-600">Your API Key (copy it now)</div>
            <div className="text-lg font-semibold mt-1 text-slate-950">Set up your website form</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm font-semibold border border-slate-300 bg-white text-slate-800 cursor-pointer transition-colors duration-150 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto crm-scrollbar p-5 pt-4 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4">
            <div className="text-xs font-medium text-slate-600 mb-2">API key</div>
            <div className="break-all text-sm font-mono text-slate-900">{apiKey}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy()}
                className="rounded-md px-3 py-2 text-sm font-semibold text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] transition-colors"
              >
                {copied ? 'Copied!' : 'Copy key'}
              </button>
            </div>
          </div>

          <div className="text-sm text-slate-700">
            Send a <span className="font-semibold text-slate-900">POST</span> request to the webhook URL and
            include:
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                Header: <span className="font-mono text-slate-900">x-api-key: &lt;your key&gt;</span>
              </li>
              <li>
                JSON body containing lead fields (first/last name, company, email, phone, industry,
                company_size, website).
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mt-4">
            <div className="text-xs font-medium text-slate-600 mb-2">Example JSON</div>
            <pre className="text-xs whitespace-pre-wrap overflow-auto text-slate-800 m-0 font-mono bg-white border border-slate-200 rounded-md p-3">
              {`{
  "first_name": "Jane",
  "last_name": "Doe",
  "company": "Acme Inc",
  "industry": "Real Estate",
  "company_size": "51-200",
  "website": "https://acme.example",
  "email": "jane@acme.example",
  "phone": "+1 555-123-4567"
}`}
            </pre>
          </div>

          <div className="mt-4 flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-end gap-3">
            {!webhookUrl.trim() ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 m-0">
                Configure <code className="text-xs bg-amber-100/80 px-1 rounded">VITE_SUPABASE_URL</code> so the
                webhook URL is available to test from the browser.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void testWebhook()}
              disabled={testing || !webhookUrl.trim()}
              className="rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed sm:ml-auto"
            >
              {testing ? 'Testing…' : 'Test webhook'}
            </button>
          </div>

          {testResult ? (
            <div className="mt-1 rounded-lg border border-slate-200 bg-slate-100 p-3 text-xs text-slate-900 whitespace-pre-wrap overflow-auto max-h-48">
              {testResult}
            </div>
          ) : null}
        </div>
      </div>
    </ModalScrollBackdrop>
  )
}
