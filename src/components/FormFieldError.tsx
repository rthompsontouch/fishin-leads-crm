/** Standard inline validation error (react-hook-form + zod). */
export default function FormFieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <em className="signup-error block not-italic" role="alert">
      {message}
    </em>
  )
}
