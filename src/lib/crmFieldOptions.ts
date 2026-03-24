import { z } from 'zod'

/** Preset industries (dropdown). "Other" uses free-text `industry_other`. */
export const CRM_INDUSTRY_PRESETS = [
  'Home services',
  'Real Estate',
  'Legal',
  'Healthcare',
  'Construction',
  'Retail',
  'Manufacturing',
  'Technology / SaaS',
  'Finance / Insurance',
  'Hospitality',
  'Education',
  'Non-profit',
  'Professional services',
  'Transportation / Logistics',
  'Agriculture',
  'Energy',
  'Government',
  'Marketing / Creative',
  'Automotive',
] as const

/** Select option value for free-text industry */
export const CRM_INDUSTRY_OTHER = 'Other' as const

export const CRM_COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
  'Not sure',
] as const

export function splitIndustryForForm(stored: string | null | undefined): {
  industry_select: string
  industry_other: string
} {
  const s = (stored ?? '').trim()
  if (!s) return { industry_select: '', industry_other: '' }
  if ((CRM_INDUSTRY_PRESETS as readonly string[]).includes(s)) {
    return { industry_select: s, industry_other: '' }
  }
  return { industry_select: CRM_INDUSTRY_OTHER, industry_other: s }
}

export function resolveIndustryFromForm(
  industry_select: string,
  industry_other: string,
): string | null {
  const sel = (industry_select ?? '').trim()
  if (!sel) return null
  if (sel === CRM_INDUSTRY_OTHER) {
    const o = (industry_other ?? '').trim()
    return o.length > 0 ? o : null
  }
  return sel
}

/** Dropdown options; keeps a legacy stored value visible if it is not a preset. */
export function buildCompanySizeOptions(stored?: string | null): string[] {
  const base: string[] = [...CRM_COMPANY_SIZES]
  const s = stored?.trim() ?? ''
  if (s && !base.includes(s)) base.push(s)
  return base
}

const industrySelectAllowed = new Set<string>([
  '',
  ...CRM_INDUSTRY_PRESETS,
  CRM_INDUSTRY_OTHER,
])

/** Zod: industry_select + industry_other → validated pair */
export const industrySelectZ = z
  .string()
  .refine((s) => industrySelectAllowed.has(s), { message: 'Select an industry.' })

export const industryOtherZ = z.string()

export function refineIndustryOther(
  data: { industry_select: string; industry_other: string },
  ctx: z.RefinementCtx,
) {
  if (data.industry_select === CRM_INDUSTRY_OTHER) {
    const o = (data.industry_other ?? '').trim()
    if (o.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter your industry (at least 2 characters).',
        path: ['industry_other'],
      })
    }
  }
}

/** Optional phone: empty OK; otherwise 10–15 digits after stripping formatting. */
export const optionalPhoneZ = z
  .string()
  .transform((s) => s.trim())
  .superRefine((s, ctx) => {
    if (!s) return
    const digits = s.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid phone number (10–15 digits).',
      })
    }
  })

/** Optional website: empty OK; prepends https:// when scheme missing; then URL check. */
export const optionalWebsiteZ = z
  .string()
  .transform((s) => {
    const t = s.trim()
    if (!t) return ''
    return /^https?:\/\//i.test(t) ? t : `https://${t}`
  })
  .pipe(
    z.union([
      z.literal(''),
      z.string().url({ message: 'Enter a valid website URL.' }),
    ]),
  )
