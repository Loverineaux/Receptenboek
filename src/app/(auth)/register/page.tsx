'use client'

import { Suspense, useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, Lock, User, Eye, EyeOff, KeyRound, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

// Toegangscode wordt dynamisch gevalideerd via API

export default function RegisterPageWrapper() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  )
}

function RegisterPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  // Step 1: access code, Step 2: registration form
  const [step, setStep] = useState<1 | 2>(1)
  const [accessCode, setAccessCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  // Show error from redirect (e.g. blocked Google signup without code)
  useEffect(() => {
    const err = searchParams.get('error')
    if (err) setCodeError(err)
  }, [searchParams])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [verifyingCode, setVerifyingCode] = useState(false)

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setCodeError(null)
    setVerifyingCode(true)

    try {
      const res = await fetch('/api/auth/verify-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode }),
      })
      const { valid } = await res.json()

      if (!valid) {
        setCodeError('Ongeldige toegangscode. Vraag de code aan bij de beheerder.')
      } else {
        setStep(2)
      }
    } catch {
      setCodeError('Kon de code niet verifiëren. Probeer het opnieuw.')
    } finally {
      setVerifyingCode(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen')
      return
    }

    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens bevatten')
      return
    }

    setSubmitting(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(translateAuthError(error.message))
    } else if (data.user && data.user.identities?.length === 0) {
      setError('Er bestaat al een account met dit e-mailadres. Probeer in te loggen.')
    } else {
      setSuccess(true)
    }

    setSubmitting(false)
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    // Set cookie to prove access code was verified
    document.cookie = 'access_code_verified=true; path=/; max-age=300; SameSite=Lax'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (error) {
      setError(translateAuthError(error.message))
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="rounded-xl bg-surface p-8 shadow-sm border border-gray-100 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              Check je email
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              We hebben een bevestigingslink gestuurd naar <strong>{email}</strong>.
              Klik op de link om je account te activeren.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
            >
              Terug naar inloggen
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-surface p-8 shadow-sm border border-gray-100">
          {step === 1 ? (
            <>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">Registreren</h1>
                <p className="mt-2 text-sm text-text-secondary">
                  Voer de toegangscode in om een account aan te maken
                </p>
              </div>

              {codeError && (
                <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
                  {codeError}
                </div>
              )}

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <Input
                  label="Toegangscode"
                  type="text"
                  placeholder="Voer de code in"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  icon={<KeyRound className="h-4 w-4" />}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={verifyingCode}
                  className="w-full"
                >
                  Doorgaan
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-text-secondary">
                Al een account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Inloggen
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-text-primary">Account aanmaken</h1>
                <p className="mt-2 text-sm text-text-secondary">
                  Kies hoe je wilt registreren
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
                  {error}
                </div>
              )}

              {/* Google sign up */}
              <button
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Registreren met Google
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-text-muted">of met e-mail</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Naam"
                  type="text"
                  placeholder="Jouw naam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  icon={<User className="h-4 w-4" />}
                  required
                />

                <Input
                  label="E-mailadres"
                  type="email"
                  placeholder="jouw@email.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  required
                />

                <Input
                  label="Wachtwoord"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimaal 6 tekens"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-text-muted hover:text-text-primary"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  required
                />

                <Input
                  label="Bevestig wachtwoord"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Herhaal wachtwoord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  error={
                    confirmPassword && password !== confirmPassword
                      ? 'Wachtwoorden komen niet overeen'
                      : undefined
                  }
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  className="w-full"
                >
                  Registreren
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-text-muted hover:text-text-primary"
                >
                  Terug
                </button>
                <Link href="/login" className="text-sm font-medium text-primary hover:underline">
                  Al een account? Inloggen
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
