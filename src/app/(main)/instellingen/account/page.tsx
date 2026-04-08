'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Camera, KeyRound, Mail, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AvatarCropModal from '@/components/ui/AvatarCropModal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function AccountInstellingenPage() {
  const router = useRouter();
  const { user, profile, loading, resetPassword, refreshProfile } = useAuth();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [resetSent, setResetSent] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  // Track if form has unsaved changes
  useEffect(() => {
    if (!profile) return;
    const changed =
      displayName !== (profile.display_name || '') ||
      bio !== (profile.bio || '') ||
      avatarUrl !== (profile.avatar_url || '');
    setHasChanges(changed);
  }, [displayName, bio, avatarUrl, profile]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, bio, avatar_url: avatarUrl })
      .eq('id', user!.id);

    if (error) {
      showToast('Opslaan mislukt: ' + error.message, 'error');
    } else {
      showToast('Profiel opgeslagen');
      setHasChanges(false);
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleFileSelect = (file: File) => {
    // Read file and open crop modal
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCroppedUpload = async (blob: Blob) => {
    if (!user) return;
    setCropImageSrc(null);
    setUploading(true);

    const path = `${user.id}/avatar.jpg`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

    if (uploadErr) {
      showToast('Upload mislukt: ' + uploadErr.message, 'error');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    // Append timestamp to bust cache
    const newUrl = urlData.publicUrl + '?t=' + Date.now();
    setAvatarUrl(newUrl);

    const { error: saveErr } = await supabase
      .from('profiles')
      .update({ avatar_url: newUrl })
      .eq('id', user.id);

    if (saveErr) {
      showToast('Foto geupload maar profiel update mislukt', 'error');
    } else {
      showToast('Profielfoto bijgewerkt');
      await refreshProfile();
    }
    setUploading(false);
  };

  const handleResetPassword = async () => {
    setConfirmReset(false);
    if (!user?.email || resetSent) return;
    const { error } = await resetPassword(user.email);
    if (error) {
      showToast('Kon reset e-mail niet versturen.', 'error');
    } else {
      setResetSent(true);
      showToast('Wachtwoord reset e-mail verstuurd!');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24">
      <div className="sticky top-14 z-20 -mx-4 bg-background px-4 pb-2 pt-4 md:top-16">
        <button
          onClick={() => router.push('/instellingen')}
          className="flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Instellingen
        </button>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-text-primary">Account</h1>

      {/* ── Avatar ── */}
      <div className="mb-6 flex items-center gap-4">
        <label className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full bg-gray-100">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-8 w-8 text-text-muted" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
            <Camera className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = '';
            }}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </label>
        <div>
          <p className="font-medium text-text-primary">
            {profile?.display_name || 'Geen naam ingesteld'}
          </p>
          <p className="text-sm text-text-muted">Tik op de foto om te wijzigen</p>
        </div>
      </div>

      {/* ── Profile form ── */}
      <form onSubmit={handleSave}>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
          {/* Display name */}
          <div className="px-4 py-3">
            <label className="mb-1 block text-xs font-medium text-text-muted">Weergavenaam</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jouw naam"
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>

          <div className="border-t border-gray-100" />

          {/* Email (read-only) */}
          <div className="px-4 py-3">
            <label className="mb-1 block text-xs font-medium text-text-muted">E-mailadres</label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-text-muted" />
              <p className="text-sm text-text-secondary">{user.email}</p>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Bio */}
          <div className="px-4 py-3">
            <label className="mb-1 block text-xs font-medium text-text-muted">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Vertel iets over jezelf..."
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Save button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          disabled={!hasChanges}
          className="mt-4 w-full"
        >
          {hasChanges ? 'Opslaan' : (
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              Opgeslagen
            </span>
          )}
        </Button>
      </form>

      {/* ── Password ── */}
      <div className="mt-8">
        <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Wachtwoord
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
          <button
            onClick={() => setConfirmReset(true)}
            disabled={resetSent}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <KeyRound className="h-4 w-4 text-text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Wachtwoord wijzigen</p>
              <p className="text-xs text-text-muted">
                {resetSent
                  ? 'Reset e-mail verstuurd — check je inbox'
                  : 'We sturen een e-mail waarmee je een nieuw wachtwoord kunt instellen'}
              </p>
            </div>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Wachtwoord wijzigen"
        message="We sturen een e-mail waarmee je een nieuw wachtwoord kunt instellen. Wil je doorgaan?"
        confirmLabel="Verstuur e-mail"
        variant="primary"
        onConfirm={handleResetPassword}
        onCancel={() => setConfirmReset(false)}
      />

      {/* Avatar crop modal */}
      {cropImageSrc && (
        <AvatarCropModal
          open={!!cropImageSrc}
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCropComplete={handleCroppedUpload}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <div className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
          toastType === 'error' ? 'bg-red-600' : 'bg-gray-800'
        }`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
