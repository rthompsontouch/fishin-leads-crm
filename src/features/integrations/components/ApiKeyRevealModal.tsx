import { useEffect, useState } from 'react'
import ModalScrollBackdrop from '../../../components/ModalScrollBackdrop'

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
    setTesting(true)
    setTestResult(null)
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
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
      setTestResult(String((e as Error).message ?? e))
    } finally {
      setTesting(false)
    }
  }

  return (
    <ModalScrollBackdrop onBackdropClose={onClose} zClass="z-50" role="dialog" aria-modal>
      <div
        className="crm-modal-panel-mobile-fs my-4 w-full max-w-[min(720px,100%)] max-h-[min(92dvh,880px)] min-h-0 flex flex-col rounded-xl border shadow-lg overflow-hidden"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-4 p-5 pb-0">
          <div>
            <div className="text-sm opacity-70">Your API Key (copy it now)</div>
            <div className="text-lg font-semibold mt-1">Set up your website form</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)]"
          >
            Close
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto crm-scrollbar p-5 pt-4 space-y-4">
        <div
          className="rounded-lg border p-4 mb-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div className="text-xs opacity-70 mb-2">API key</div>
          <div
            className="break-all text-sm font-mono"
            style={{ color: 'var(--color-foreground)' }}
          >
            {apiKey}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-md px-3 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              {copied ? 'Copied!' : 'Copy key'}
            </button>
          </div>
        </div>

        <div className="text-sm opacity-80">
          Send a <span style={{ fontWeight: 700 }}>POST</span> request to the webhook URL and include:
          <ul className="list-disc ml-5 mt-2">
            <li>
              Header: <span className="font-mono">x-api-key: &lt;your key&gt;</span>
            </li>
            <li>
              JSON body containing lead fields (first/last name, company, email, phone, industry, company_size, website).
            </li>
          </ul>
        </div>

        <div
          className="rounded-lg border p-4 mt-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <div className="text-xs opacity-70 mb-2">Example JSON</div>
          <pre
            className="text-xs whitespace-pre-wrap overflow-auto"
            style={{ margin: 0 }}
          >
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

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => void testWebhook()}
            disabled={testing || !webhookUrl}
            className="rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[color:var(--color-primary)]"
          >
            {testing ? 'Testing...' : 'Test webhook'}
          </button>
        </div>

        {testResult ? (
          <div
            className="mt-3 rounded-lg border p-3 text-xs whitespace-pre-wrap overflow-auto"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
          >
            {testResult}
          </div>
        ) : null}
        </div>
      </div>
    </ModalScrollBackdrop>
  )
}

