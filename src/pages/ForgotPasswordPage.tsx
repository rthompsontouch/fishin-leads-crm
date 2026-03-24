import ForgotPasswordPanel from '../features/auth/components/ForgotPasswordPanel'

export default function ForgotPasswordPage() {
  return (
    <div
      className="min-h-dvh grid place-items-center p-6"
      style={{
        background: 'var(--color-background)',
        color: 'var(--color-foreground)',
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-6 shadow-sm"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <ForgotPasswordPanel />
      </div>
    </div>
  )
}
