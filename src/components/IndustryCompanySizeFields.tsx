import type { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form'
import {
  CRM_INDUSTRY_OTHER,
  CRM_INDUSTRY_PRESETS,
} from '../lib/crmFieldOptions'

const inputClass =
  'rounded-md border px-3 py-2 outline-none bg-white text-slate-900 border-slate-300'

type Props = {
  register: UseFormRegister<Record<string, unknown>>
  watch: UseFormWatch<Record<string, unknown>>
  errors: FieldErrors<Record<string, unknown>>
  companySizeChoices: readonly string[]
}

/**
 * Industry preset dropdown + "Other" text field; company size dropdown.
 * Parent grid should be `grid`; use `className="contents"` wrapper if needed for subgrid alignment.
 */
export default function IndustryCompanySizeFields({
  register,
  watch,
  errors,
  companySizeChoices,
}: Props) {
  const industrySelect = String(watch('industry_select') ?? '')
  const isOther = industrySelect === CRM_INDUSTRY_OTHER

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Industry
        <select
          className={inputClass}
          style={{ borderColor: 'var(--color-border)' }}
          {...register('industry_select')}
        >
          <option value="">Select…</option>
          {CRM_INDUSTRY_PRESETS.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
          <option value={CRM_INDUSTRY_OTHER}>Other</option>
        </select>
        {errors.industry_select?.message ? (
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {String(errors.industry_select.message)}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Company size
        <select
          className={inputClass}
          style={{ borderColor: 'var(--color-border)' }}
          {...register('company_size')}
        >
          <option value="">Optional</option>
          {companySizeChoices.map((sz) => (
            <option key={sz} value={sz}>
              {sz}
            </option>
          ))}
        </select>
        {errors.company_size?.message ? (
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {String(errors.company_size.message)}
          </span>
        ) : null}
      </label>

      {isOther ? (
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Specify industry
          <input
            className={inputClass}
            style={{ borderColor: 'var(--color-border)' }}
            placeholder="e.g. Marine surveying"
            {...register('industry_other')}
          />
          {errors.industry_other?.message ? (
            <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
              {String(errors.industry_other.message)}
            </span>
          ) : null}
        </label>
      ) : null}
    </>
  )
}
