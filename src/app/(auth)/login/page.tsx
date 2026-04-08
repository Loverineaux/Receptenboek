'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, loading } = useAuth()
  const supabase = createClient()

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

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-text-muted">of</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Google sign in */}
          <button
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/api/auth/callback`,
                },
              })
              if (error) setError(translateAuthError(error.message))
            }}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Inloggen met Google
          </button>

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
