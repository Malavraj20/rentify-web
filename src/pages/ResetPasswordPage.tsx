import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { apiRequest, extractErrorMessage } from '../utils/api'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasToken = token.length > 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return

    if (!hasToken) {
      setError('This reset link is missing or invalid.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest<{ message?: string }>(
        'POST',
        '/api/auth/reset-password',
        { token, password },
      )

      if (!result.ok) {
        setError(
          extractErrorMessage(
            result,
            'This reset link is invalid or has expired. Please request a new one.',
          ),
        )
        return
      }

      setNotice(
        result.data?.message ??
          'Password updated successfully. You can now sign in with your new password.',
      )
      setPassword('')
      setConfirmPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-deepNavy">
      <Header />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16 pt-8 sm:px-6">
        <section
          aria-labelledby="reset-password-heading"
          className="rounded-3xl border border-rentify-grayLight bg-white p-6 shadow-sm sm:p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
            Password recovery
          </p>
          <h1
            id="reset-password-heading"
            className="mt-2 font-display text-2xl font-bold tracking-tight text-rentify-deepNavy"
          >
            Set a new password
          </h1>
          <p className="mt-1.5 text-sm text-rentify-grayMuted">
            Choose a strong password for your Rentify account. You&apos;ll use
            it the next time you sign in.
          </p>

          {!hasToken && (
            <p
              className="mt-6 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600"
              role="alert"
            >
              This reset link is missing or invalid. Please request a new
              password reset.
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
            noValidate
          >
            <div>
              <label
                htmlFor="reset-password"
                className="mb-1.5 block text-sm font-medium text-rentify-deepNavy"
              >
                New password
              </label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                disabled={!hasToken || submitting}
              />
            </div>

            <div>
              <label
                htmlFor="reset-confirm-password"
                className="mb-1.5 block text-sm font-medium text-rentify-deepNavy"
              >
                Confirm new password
              </label>
              <Input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                disabled={!hasToken || submitting}
              />
            </div>

            {error && (
              <p
                className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600"
                role="alert"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                className="rounded-xl bg-rentify-purpleLight3 px-3.5 py-2.5 text-sm font-medium text-rentify-deepNavy"
                role="status"
              >
                {notice}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-rentify-deepNavy! hover:bg-rentify-lightNavy!"
              size="lg"
              disabled={!hasToken || submitting}
            >
              {submitting ? 'Updating…' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <Link
              to="/auth?mode=signin"
              className="text-sm font-semibold text-rentify-deepNavy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Sign In
            </Link>
            <Link
              to="/auth?mode=signin"
              id="reset-back-to-forgot"
              className="text-sm font-semibold text-rentify-deepNavy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Request a new reset link
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default ResetPasswordPage
