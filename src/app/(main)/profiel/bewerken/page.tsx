'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ArrowLeft, Camera, Trash2, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import IconButton from '@/components/ui/IconButton';
import ScreenHeader from '@/components/ui/ScreenHeader';

const AvatarCropModal = dynamic(() => import('@/components/ui/AvatarCropModal'));

export default function ProfielBewerkenPage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, bio, avatar_url: avatarUrl })
      .eq('id', user!.id);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Profiel succesvol bijgewerkt');
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCroppedUpload = async (blob: Blob) => {
    if (!user) return;
    setCropImageSrc(null);
    setUploading(true);
    setError(null);
    setSuccess(null);

    const path = `${user.id}/avatar.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

    if (uploadErr) {
      setError('Upload mislukt: ' + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const newUrl = urlData.publicUrl + '?t=' + Date.now();
    setAvatarUrl(newUrl);

    const { error: saveErr } = await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', user.id);
    if (saveErr) {
      setError('Foto opgeslagen maar profiel update mislukt: ' + saveErr.message);
    } else {
      setSuccess('Profielfoto bijgewerkt');
      await refreshProfile();
    }
    setUploading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'VERWIJDER') return;
    setDeleting(true);
    const res = await fetch('/api/users/delete-account', { method: 'POST' });
    if (!res.ok) {
      setError('Kon account niet verwijderen. Probeer het later opnieuw.');
      setDeleting(false);
      setShowDeleteModal(false);
    } else {
      window.location.href = '/';
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

  const initial = (displayName || profile?.display_name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="pt-1">
        <IconButton label="Terug naar profiel" onClick={() => router.push('/profiel')}>
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </IconButton>
      </div>

      <ScreenHeader title="Profiel bewerken" subtitle="Naam, foto en bio" profileButton={false} />

      <div className="mt-5 space-y-4">
        {error && (
          <div role="alert" className="rounded-card bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="rounded-card bg-primary-tint px-4 py-3 text-sm font-medium text-primary">
            {success}
          </div>
        )}

        <div className="rounded-card-lg border border-line bg-surface p-5">
          <div className="mb-6 flex items-center gap-4">
            <label
              className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full bg-placeholder focus-within:ring-2 focus-within:ring-primary/40"
              aria-label="Profielfoto wijzigen"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profielfoto" fill sizes="80px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-3xl font-semibold text-ink-2">
                  {initial === '?' ? <User className="h-8 w-8 text-ink-3" /> : initial}
                </div>
              )}
              <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary">
                <Camera className="h-3.5 w-3.5" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
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
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{profile?.display_name || 'Geen naam ingesteld'}</p>
              <p className="truncate text-sm text-ink-3">{user.email}</p>
              <p className="mt-1 text-xs text-ink-3">Tik op je foto om een nieuwe te kiezen.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Weergavenaam"
              type="text"
              placeholder="Jouw naam"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              icon={<User className="h-4 w-4" />}
            />

            <Input
              label="E-mailadres"
              type="email"
              value={user.email || ''}
              disabled
              icon={<span className="text-xs">@</span>}
            />

            <div className="w-full">
              <label htmlFor="bio" className="mb-1.5 block text-[13px] font-semibold text-ink-3">
                Bio
              </label>
              <textarea
                id="bio"
                className="w-full rounded-input border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-4 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                rows={3}
                placeholder="Vertel iets over jezelf..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" loading={saving} className="w-full">
              Opslaan
            </Button>
          </form>
        </div>

        {/* Gevarenzone */}
        <div className="rounded-card-lg border border-error/20 bg-surface p-5">
          <h2 className="font-display text-section font-semibold text-error">Gevarenzone</h2>
          <p className="mt-1 text-sm text-ink-3">
            Het verwijderen van je account is permanent en kan niet ongedaan worden gemaakt.
          </p>
          <Button type="button" variant="danger" size="md" className="mt-4" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="h-4 w-4" />
            Account verwijderen
          </Button>
        </div>
      </div>

      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirm('');
        }}
        title="Account verwijderen"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirm('');
              }}
            >
              Annuleren
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={deleteConfirm !== 'VERWIJDER'}
              onClick={handleDeleteAccount}
            >
              Definitief verwijderen
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-3">
          Weet je zeker dat je je account wilt verwijderen? Al je recepten en gegevens worden permanent verwijderd.
        </p>
        <p className="mt-3 text-sm text-ink-3">
          Typ <strong className="text-ink">VERWIJDER</strong> om te bevestigen:
        </p>
        <Input
          type="text"
          placeholder="VERWIJDER"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          className="mt-2"
        />
      </Modal>

      {cropImageSrc && (
        <AvatarCropModal
          open={!!cropImageSrc}
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCropComplete={handleCroppedUpload}
        />
      )}
    </div>
  );
}
