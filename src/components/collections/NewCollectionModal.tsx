'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { CollectionWithDetails, UserProfile } from '@/types';

const UserPicker = dynamic(() => import('@/components/ui/UserPicker'));

interface NewCollectionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (collection: CollectionWithDetails) => void;
}

/** Collectie aanmaken (titel, beschrijving, sous-chefs). Gedeeld door Favorieten en Collecties. */
export default function NewCollectionModal({ open, onClose, onCreated }: NewCollectionModalProps) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [collaborators, setCollaborators] = useState<Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() || null }),
      });

      if (!res.ok) {
        setError('Aanmaken is niet gelukt. Probeer het opnieuw.');
        return;
      }

      const data = await res.json();
      for (const collab of collaborators) {
        await fetch(`/api/collections/${data.id}/collaborators`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: collab.id }),
        });
      }

      onCreated({
        ...data,
        user: profile && user ? { id: user.id, display_name: profile.display_name, avatar_url: profile.avatar_url } : null,
        recipe_count: 0,
        preview_images: [],
        collaborators: collaborators as UserProfile[],
        follower_count: 0,
      });
      setTitle('');
      setDesc('');
      setCollaborators([]);
      onClose();
    } catch {
      setError('Aanmaken is niet gelukt. Probeer het opnieuw.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nieuwe collectie"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuleren
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={!title.trim()} loading={creating}>
            Aanmaken
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Titel *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Bijv. BBQ favorieten"
          autoFocus
        />
        <div>
          <label htmlFor="new-collection-desc" className="mb-1.5 block text-[13px] font-semibold text-ink-3">
            Beschrijving
          </label>
          <textarea
            id="new-collection-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Waar gaat deze collectie over?"
            rows={3}
            className="w-full resize-none rounded-input border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div>
          <p className="mb-1 text-[13px] font-semibold text-ink-3">Sous-chefs</p>
          <p className="mb-2 text-meta text-ink-3">
            Sous-chefs kunnen recepten toevoegen en verwijderen. (optioneel, max 10)
          </p>
          <UserPicker
            selectedUsers={collaborators}
            onAdd={(u) => setCollaborators((prev) => [...prev, u])}
            onRemove={(id) => setCollaborators((prev) => prev.filter((u) => u.id !== id))}
            maxUsers={10}
          />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    </Modal>
  );
}
