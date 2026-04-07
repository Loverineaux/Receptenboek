'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Smartphone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { NotificationPreferences } from '@/types';

const NOTIFICATION_TYPES = [
  {
    key: 'comment' as const,
    label: 'Reacties',
    description: 'Iemand plaatst een reactie op jouw recept',
  },
  {
    key: 'favorite' as const,
    label: 'Favorieten',
    description: 'Iemand slaat je recept op als favoriet',
  },
  {
    key: 'rating' as const,
    label: 'Beoordelingen',
    description: 'Iemand beoordeelt je recept',
  },
  {
    key: 'comment_like' as const,
    label: 'Reactie likes',
    description: 'Iemand vindt je reactie leuk',
  },
  {
    key: 'collection_follow' as const,
    label: 'Collectie volgers',
    description: 'Iemand volgt je collectie',
  },
  {
    key: 'collection_invite' as const,
    label: 'Collectie uitnodigingen',
    description: 'Je wordt uitgenodigd als medewerker',
  },
];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-300'
      } ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function MeldingenInstellingenPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushRegistering, setPushRegistering] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/preferences');
      if (res.ok) setPrefs(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) fetchPrefs();
  }, [user, authLoading, fetchPrefs, router]);

  const updatePref = async (key: string, value: boolean) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value });
    setSaving(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) setPrefs(await res.json());
      else setPrefs({ ...prefs, [key]: !value });
    } catch {
      setPrefs({ ...prefs, [key]: !value });
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      setPushRegistering(true);
      try {
        const { requestPushPermission } = await import('@/lib/firebase/client');
        const token = await requestPushPermission();
        if (token) {
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              device_name: navigator.userAgent.includes('Mobile') ? 'Mobiel' : 'Desktop',
            }),
          });
          await updatePref('push_enabled', true);
        } else {
          showToast('Push notificaties worden niet ondersteund of je hebt toestemming geweigerd.');
        }
      } catch {
        showToast('Kon push notificaties niet inschakelen.');
      } finally {
        setPushRegistering(false);
      }
    } else {
      await updatePref('push_enabled', false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      <button
        onClick={() => router.push('/instellingen')}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Instellingen
      </button>

      <h1 className="mb-6 text-2xl font-bold text-text-primary">Meldingen</h1>

      {/* ── Push toggle ── */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="mr-4 flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text-primary">Push notificaties</p>
                <p className="text-xs text-text-muted">
                  {prefs.push_enabled
                    ? 'Actief op dit apparaat'
                    : 'Ontvang meldingen buiten de app'}
                </p>
              </div>
            </div>
            {pushRegistering ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Toggle
                checked={prefs.push_enabled}
                onChange={handlePushToggle}
                disabled={saving}
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Per-type toggles ── */}
      <section>
        <p className="mb-3 text-sm text-text-muted">
          Kies welke meldingen je wilt ontvangen.
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
          {NOTIFICATION_TYPES.map((type, i) => (
            <div
              key={type.key}
              className={`flex items-center justify-between px-4 py-3 ${
                i < NOTIFICATION_TYPES.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="mr-4">
                <p className="text-sm font-medium text-text-primary">{type.label}</p>
                <p className="text-xs text-text-muted">{type.description}</p>
              </div>
              <Toggle
                checked={prefs[type.key]}
                onChange={(val) => updatePref(type.key, val)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
      </section>

      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
