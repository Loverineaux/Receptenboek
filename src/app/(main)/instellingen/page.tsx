'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Bell, User, Shield, LogOut,
  ChevronRight, Trash2, ChefHat, Users, Info, HelpCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useTour } from '@/hooks/useTour';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

function SettingsItem({
  icon: Icon,
  label,
  description,
  onClick,
  danger,
  trailing,
}: {
  icon: any;
  label: string;
  description?: string;
  onClick?: () => void;
  danger?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
        danger ? 'hover:bg-red-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
        danger ? 'bg-red-50' : 'bg-gray-100'
      }`}>
        <Icon className={`h-4 w-4 ${danger ? 'text-red-500' : 'text-text-muted'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${danger ? 'text-red-600' : 'text-text-primary'}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-text-muted">{description}</p>
        )}
      </div>
      {trailing !== null && (trailing ?? <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-muted" />)}
    </button>
  );
}

function Divider() {
  return <div className="border-t border-gray-100" />;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 mt-6 px-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
      {children}
    </p>
  );
}

export default function InstellingenPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { startTour } = useTour();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    setConfirmLogout(false);
    await signOut();
    window.location.href = '/';
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'VERWIJDER') return;
    setDeleting(true);
    const res = await fetch('/api/users/delete-account', { method: 'POST' });
    const error = res.ok ? null : await res.json().then((d) => d.error || 'Onbekende fout');
    if (error) {
      showToast('Kon account niet verwijderen. Probeer het later opnieuw.');
      setDeleting(false);
      setConfirmDelete(false);
    } else {
      await signOut();
      window.location.href = '/login';
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24">
      <div className="sticky top-14 z-20 -mx-4 bg-background px-4 pb-2 pt-4 md:top-16">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug
        </button>
      </div>

      <h1 className="sr-only">Instellingen</h1>

      {/* ── Profile header ── */}
      <button
        onClick={() => router.push('/instellingen/account')}
        className="mb-2 flex w-full flex-col items-center gap-2 py-4"
      >
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary-light">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill className="object-cover" />
          ) : (
            <User className="h-8 w-8 text-primary" />
          )}
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary">
            {profile?.display_name || 'Gebruiker'}
          </p>
          <p className="text-sm text-text-muted">{user.email}</p>
        </div>
      </button>

      {/* ── Account ── */}
      <SectionLabel>Account</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
        <SettingsItem
          icon={User}
          label="Account beheren"
          description="Naam, foto, bio en wachtwoord"
          onClick={() => router.push('/instellingen/account')}
        />
      </div>

      {/* ── Notifications ── */}
      <SectionLabel>Meldingen</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
        <SettingsItem
          icon={Bell}
          label="Meldingen"
          description="Push notificaties en voorkeuren"
          onClick={() => router.push('/instellingen/meldingen')}
        />
      </div>

      {/* ── My content ── */}
      <SectionLabel>Mijn content</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
        <SettingsItem
          icon={ChefHat}
          label="Mijn recepten"
          description="Recepten die jij hebt toegevoegd"
          onClick={() => router.push('/instellingen/mijn-recepten')}
        />
      </div>

      {/* ── Community ── */}
      <SectionLabel>Community</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
        <SettingsItem
          icon={Users}
          label="Gebruikers"
          description="Zoek andere koks en bekijk hun profiel"
          onClick={() => router.push('/instellingen/gebruikers')}
        />
      </div>

      {/* ── About ── */}
      <SectionLabel>Over</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
        <SettingsItem
          icon={HelpCircle}
          label="Rondleiding"
          description="Bekijk de introductierondleiding opnieuw"
          onClick={async () => {
            localStorage.removeItem('tour-completed');
            const supabase = (await import('@/lib/supabase/client')).createClient();
            await supabase.from('profiles').update({ has_completed_tour: false }).eq('id', user!.id);
            router.push('/recepten');
            setTimeout(() => startTour(), 1500);
          }}
        />
        <Divider />
        <SettingsItem
          icon={Info}
          label="Over Receptenboek"
          description="Versie, maker en meer"
          onClick={() => router.push('/instellingen/over')}
        />
      </div>

      {/* ── Danger zone ── */}
      <SectionLabel>Sessie & privacy</SectionLabel>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
        <SettingsItem
          icon={LogOut}
          label="Uitloggen"
          onClick={() => setConfirmLogout(true)}
          trailing={null}
        />
        <Divider />
        <SettingsItem
          icon={Trash2}
          label="Account verwijderen"
          description="Verwijder al je gegevens permanent"
          danger
          onClick={() => setConfirmDelete(true)}
          trailing={null}
        />
      </div>

      {/* ── Dialogs ── */}
      <ConfirmDialog
        open={confirmLogout}
        title="Uitloggen"
        message="Weet je zeker dat je wilt uitloggen?"
        confirmLabel="Uitloggen"
        variant="primary"
        onConfirm={handleSignOut}
        onCancel={() => setConfirmLogout(false)}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text-primary">Account verwijderen</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Dit kan niet ongedaan worden gemaakt. Al je recepten, favorieten, reacties en persoonlijke gegevens worden permanent verwijderd.
            </p>
            <p className="mt-3 text-sm text-text-secondary">
              Typ <span className="font-mono font-bold text-red-600">VERWIJDER</span> om te bevestigen:
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="VERWIJDER"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteText(''); }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteText !== 'VERWIJDER' || deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Verwijderen...' : 'Definitief verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
