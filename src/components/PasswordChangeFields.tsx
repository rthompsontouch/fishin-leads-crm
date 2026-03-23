import { useState } from 'react'
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import FormFieldError from './FormFieldError'
import NewPasswordPairFields, { type NewPasswordPair } from './NewPasswordPairFields'

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

export type PasswordChangeFormFields = NewPasswordPair & {
  current_password: string
}

type Props = {
  register: UseFormRegister<PasswordChangeFormFields>
  watch: UseFormWatch<PasswordChangeFormFields>
  setValue: UseFormSetValue<PasswordChangeFormFields>
  errors: FieldErrors<PasswordChangeFormFields>
  trigger: (name?: keyof PasswordChangeFormFields | (keyof PasswordChangeFormFields)[]) => Promise<boolean>
  getValues: (name: keyof PasswordChangeFormFields) => string
  disabled?: boolean
}

export default function PasswordChangeFields({
  register,
  watch,
  setValue,
  errors,
  trigger,
  getValues,
  disabled,
}: Props) {
  const [showCurrent, setShowCurrent] = useState(false)

  const invalid = (field: keyof PasswordChangeFormFields) => Boolean(errors[field])

  const registerNew = register as unknown as UseFormRegister<NewPasswordPair>
  const watchNew = watch as unknown as UseFormWatch<NewPasswordPair>
  const setValueNew = setValue as unknown as UseFormSetValue<NewPasswordPair>
  const errorsNew = errors as unknown as FieldErrors<NewPasswordPair>

  return (
    <div className="flex flex-col gap-0">
      <label className="signup-field">
        <span>
          Current password <b>*</b>
        </span>
        <div className="signup-password-control">
          <input
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            disabled={disabled}
            className={invalid('current_password') ? 'is-invalid' : ''}
            aria-invalid={invalid('current_password') ? 'true' : 'false'}
            {...register('current_password')}
          />
          <button
            type="button"
            className="signup-eye-btn"
            disabled={disabled}
            onClick={() => setShowCurrent((v) => !v)}
            aria-label={showCurrent ? 'Hide password' : 'Show password'}
          >
            {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <FormFieldError message={errors.current_password?.message} />
      </label>

      <NewPasswordPairFields
        register={registerNew}
        watch={watchNew}
        setValue={setValueNew}
        errors={errorsNew}
        trigger={trigger as unknown as Props['trigger']}
        getValues={getValues as unknown as Props['getValues']}
        disabled={disabled}
      />
    </div>
  )
}
