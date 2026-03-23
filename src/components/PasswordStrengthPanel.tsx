import { useMemo } from 'react'
import { getPasswordChecks, passwordStrengthMeta } from '../lib/passwordStrength'

/** Visual meter + checklist (same as marketing SignupPanel). */
export default function PasswordStrengthPanel({ password }: { password: string }) {
  const passwordChecks = useMemo(() => getPasswordChecks(password), [password])
  const { score, level, strengthClass } = useMemo(() => passwordStrengthMeta(password), [password])

  return (
    <div className="signup-password-meter" aria-live="polite">
      <div className="signup-password-meter-head">
        <span>Password strength</span>
        <strong className={strengthClass}>{level}</strong>
      </div>
      <div className="signup-password-meter-track">
        <span
          className={`signup-password-meter-fill ${strengthClass}`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <ul className="signup-password-checks">
        {passwordChecks.map((rule) => (
          <li key={rule.key} className={rule.pass ? 'is-pass' : ''}>
            <span aria-hidden="true">{rule.pass ? '✓' : '•'}</span>
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
