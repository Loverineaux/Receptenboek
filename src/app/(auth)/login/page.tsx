'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { translateAuthError } from '@/lib/auth-errors'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signInWithGoogle, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      console.log('[Login] Attempting sign in for:', email)
      const { error } = await signIn(email, password)
      console.log('[Login] signIn result — error:', error)

      if (error) {
        console.error('[Login] Auth error:', error.message, error.status, error)
        setError(translateAuthError(error.message))
      } else {
        console.log('[Login] Success, redirecting to /recepten')
        router.push('/recepten')
        router.refresh()
      }
    } catch (err: any) {
      console.error('[Login] Unexpected error:', err)
      setError(err.message || 'Er ging iets mis bij het inloggen')
    } finally {
      console.log('[Login] Done, stopping spinner')
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(translateAuthError(error.message))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-surface p-8 shadow-sm border border-gray-100">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary">Inloggen</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Welkom terug bij Receptenboek
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

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

            <Input
              label="Wachtwoord"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
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

            <div className="flex justify-end">
              <Link
                href="/wachtwoord-vergeten"
                className="text-sm text-primary hover:underline"
              >
                Wachtwoord vergeten?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              Inloggen
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Nog geen account?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Registreer
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
