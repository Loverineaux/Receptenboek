'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { User, Camera, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

export default function ProfielPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
      })
      .eq('id', user!.id)

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Profiel succesvol bijgewerkt')
    }

    setSaving(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'VERWIJDER') return

    setDeleting(true)

    const res = await fetch('/api/users/delete-account', { method: 'POST' })

    if (!res.ok) {
      setError('Kon account niet verwijderen. Probeer het later opnieuw.')
      setDeleting(false)
      setShowDeleteModal(false)
    } else {
      window.location.href = '/'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">Mijn profiel</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-primary-light px-4 py-3 text-sm text-primary">
            {success}
          </div>
        )}

        <div className="rounded-xl bg-surface p-6 shadow-sm border border-gray-100">
          {/* Avatar preview */}
          <div className="mb-6 flex items-center gap-4">
            <label className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-full bg-gray-100">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-8 w-8 text-text-muted" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/30">
                <Camera className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !user) return

                  setUploading(true)
                  setError(null)

                  const ext = file.name.split('.').pop()
                  const path = `${user.id}/avatar.${ext}`

                  const { error: uploadErr } = await supabase.storage
                    .from('avatars')
                    .upload(path, file, { upsert: true })

                  if (uploadErr) {
                    setError('Upload mislukt: ' + uploadErr.message)
                    setUploading(false)
                    return
                  }

                  const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(path)

                  const newUrl = urlData.publicUrl
                  setAvatarUrl(newUrl)

                  // Save to profile immediately
                  const { error: saveErr } = await supabase
                    .from('profiles')
                    .update({ avatar_url: newUrl })
                    .eq('id', user.id)

                  if (saveErr) {
                    setError('Foto opgeslagen maar profiel update mislukt: ' + saveErr.message)
                  } else {
                    setSuccess('Profielfoto bijgewerkt')
                  }

                  setUploading(false)
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
              <p className="text-sm text-text-secondary">{user.email}</p>
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
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Bio
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
                placeholder="Vertel iets over jezelf..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <p className="text-xs text-text-muted">
              Klik op je profielfoto hierboven om een nieuwe te uploaden.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={saving}
              className="w-full"
            >
              Opslaan
            </Button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="mt-8 rounded-xl border border-error/20 bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-error">Gevarenzone</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Het verwijderen van je account is permanent en kan niet ongedaan worden
            gemaakt.
          </p>
          <Button
            type="button"
            variant="danger"
            size="md"
            className="mt-4"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4" />
            Account verwijderen
          </Button>
        </div>

        <Modal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setDeleteConfirm('')
          }}
          title="Account verwijderen"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirm('')
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
          <p className="text-sm text-text-secondary">
            Weet je zeker dat je je account wilt verwijderen? Al je recepten en
            gegevens worden permanent verwijderd.
          </p>
          <p className="mt-3 text-sm text-text-secondary">
            Typ <strong className="text-text-primary">VERWIJDER</strong> om te
            bevestigen:
          </p>
          <Input
            type="text"
            placeholder="VERWIJDER"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="mt-2"
          />
        </Modal>
      </div>
    </div>
  )
}
