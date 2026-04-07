'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { translateAuthError } from '@/lib/auth-errors'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function WachtwoordVergetenPage() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await resetPassword(email)

    if (error) {
      setError(translateAuthError(error.message))
    } else {
      setSuccess(true)
    }

    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-surface p-8 shadow-sm border border-gray-100">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary">
              Wachtwoord vergeten
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Vul je e-mailadres in om een reset link te ontvangen
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-text-secondary">
                Check je email voor de reset link. Als het adres bij ons bekend
                is, ontvang je binnen enkele minuten een email.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="E-mailadres"
                type="email"
                placeholder="jouw@email.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                className="w-full"
              >
                Verstuur reset link
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Terug naar inloggen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
