'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Check, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/auth-errors';
import Button from '@/components/ui/Button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase automatically picks up the token from the URL hash and creates a session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (in case event already fired)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(translateAuthError(error.message));
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/recepten'), 2000);
    }

    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-100 bg-surface p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              Nieuw wachtwoord
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Kies een nieuw wachtwoord voor je account
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
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Wachtwoord gewijzigd!</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Je wordt doorgestuurd naar de app...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Nieuw wachtwoord
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimaal 6 tekens"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Bevestig wachtwoord
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Herhaal je wachtwoord"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={!sessionReady}
                className="w-full"
              >
                Wachtwoord opslaan
              </Button>

              {!sessionReady && (
                <p className="text-center text-xs text-text-muted">
                  Sessie wordt geladen...
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
