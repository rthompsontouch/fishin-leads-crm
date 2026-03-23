import { z } from 'zod'

export type PasswordCheckRule = {
  key: string
  label: string
  pass: boolean
}

/** Same rules as marketing `SignupPanel` (`getPasswordChecks`). */
export function getPasswordChecks(password: string): PasswordCheckRule[] {
  return [
    { key: 'length', label: 'At least 12 characters', pass: password.length >= 12 },
    { key: 'upper', label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { key: 'lower', label: 'One lowercase letter', pass: /[a-z]/.test(password) },
    { key: 'number', label: 'One number', pass: /\d/.test(password) },
    { key: 'symbol', label: 'One special character', pass: /[^A-Za-z0-9]/.test(password) },
  ]
}

export function passwordStrengthMeta(password: string) {
  const checks = getPasswordChecks(password)
  const score = checks.filter((c) => c.pass).length
  const level = score <= 1 ? 'Weak' : score <= 3 ? 'Medium' : 'Strong'
  const strengthClass =
    score <= 1 ? 'strength-weak' : score <= 3 ? 'strength-medium' : 'strength-strong'
  return { checks, score, level, strengthClass }
}

/** Marketing `generateSecurePassword` — guaranteed character classes + shuffle. */
export function generateSecurePassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%^&*()-_=+[]{}'
  const all = upper + lower + numbers + symbols

  const guaranteed = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]

  const remaining = Array.from({ length: Math.max(length - guaranteed.length, 0) }, () =>
    all[Math.floor(Math.random() * all.length)],
  )
  const combined = [...guaranteed, ...remaining]

  for (let i = combined.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }

  return combined.join('')
}

/** Use for `new_password` — all checklist rules must pass (details shown in UI). */
export const strongNewPasswordSchema = z
  .string()
  .min(1, 'Enter a new password.')
  .refine((pwd) => getPasswordChecks(pwd).every((c) => c.pass), {
    message: 'Meet every requirement in the checklist before saving.',
  })
