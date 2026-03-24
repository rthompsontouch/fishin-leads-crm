import { useState } from 'react'
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { generateSecurePassword } from '../lib/passwordStrength'
import FormFieldError from './FormFieldError'
import PasswordStrengthPanel from './PasswordStrengthPanel'

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.8-7 10-7c2.3 0 4.3.9 5.9 2.1M22 12s-3.8 7-10 7c-2.3 0-4.3-.9-5.9-2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
      <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export type NewPasswordPair = {
  new_password: string
  confirm_password: string
}

type Props = {
  register: UseFormRegister<NewPasswordPair>
  watch: UseFormWatch<NewPasswordPair>
  setValue: UseFormSetValue<NewPasswordPair>
  errors: FieldErrors<NewPasswordPair>
  trigger: (name?: keyof NewPasswordPair | (keyof NewPasswordPair)[]) => Promise<boolean>
  getValues: (name: keyof NewPasswordPair) => string
  disabled?: boolean
}

/** New + confirm password, strength meter, generate/copy — matches marketing SignupPanel. */
export default function NewPasswordPairFields({
  register,
  watch,
  setValue,
  errors,
  trigger,
  getValues,
  disabled,
}: Props) {
  const newPassword = watch('new_password') ?? ''
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')

  const invalid = (field: keyof NewPasswordPair) => Boolean(errors[field])

  async function handleGenerate() {
    const generated = generateSecurePassword(16)
    setValue('new_password', generated, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
    setValue('confirm_password', generated, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
    await trigger(['new_password', 'confirm_password'])
    setCopyStatus('')
  }

  async function handleCopy() {
    const value = getValues('new_password') || ''
    if (!value) {
      setCopyStatus('No password yet')
      window.setTimeout(() => setCopyStatus(''), 2000)
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy failed')
    }
    window.setTimeout(() => setCopyStatus(''), 2000)
  }

  return (
    <div className="signup-grid one-col">
      <label className="signup-field">
        <span>
          New password <b>*</b>
        </span>
        <div className="signup-password-control">
          <input
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            disabled={disabled}
            className={invalid('new_password') ? 'is-invalid' : ''}
            aria-invalid={invalid('new_password') ? 'true' : 'false'}
            {...register('new_password', {
              onChange: () => {
                if (copyStatus) setCopyStatus('')
              },
            })}
          />
          <button
            type="button"
            className="signup-eye-btn"
            disabled={disabled}
            onClick={() => setShowNew((v) => !v)}
            aria-label={showNew ? 'Hide password' : 'Show password'}
          >
            {showNew ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <FormFieldError message={errors.new_password?.message} />
      </label>

      <label className="signup-field">
        <span>
          Confirm new password <b>*</b>
        </span>
        <div className="signup-password-control">
          <input
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            disabled={disabled}
            className={invalid('confirm_password') ? 'is-invalid' : ''}
            aria-invalid={invalid('confirm_password') ? 'true' : 'false'}
            {...register('confirm_password')}
          />
          <button
            type="button"
            className="signup-eye-btn"
            disabled={disabled}
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <FormFieldError message={errors.confirm_password?.message} />
      </label>

      <div className="signup-password-tools">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 signup-btn-secondary"
          disabled={disabled}
          onClick={() => void handleGenerate()}
        >
          Generate secure password
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-2 py-2 text-slate-800 transition-colors hover:bg-slate-50 signup-btn-secondary signup-copy-btn"
          disabled={disabled}
          onClick={() => void handleCopy()}
          aria-label="Copy new password"
          title="Copy new password"
        >
          <CopyIcon />
        </button>
        {copyStatus ? <span className="signup-copy-status">{copyStatus}</span> : null}
      </div>

      <PasswordStrengthPanel password={newPassword} />
    </div>
  )
}
