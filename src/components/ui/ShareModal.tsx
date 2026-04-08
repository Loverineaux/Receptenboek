'use client';

import { useState, useEffect } from 'react';
import { Link2, Send, Search, User, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/ui/Modal';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  shareType: 'recipe' | 'collection';
  itemId: string;
  /** User IDs to exclude from search (e.g. owner + collaborators) */
  excludeUserIds?: string[];
}

interface UserResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function ShareModal({ open, onClose, title, url, shareType, itemId, excludeUserIds = [] }: ShareModalProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Search users (debounced)
  useEffect(() => {
    if (!open) return;
    if (search.length < 1) { setUsers([]); setSearching(false); return; }

    setSearching(true);
    const timer = setTimeout(async () => {
      const allExcluded = [user?.id || '', ...excludeUserIds].filter(Boolean);

      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', `%${search}%`)
        .limit(20);

      const filtered = (data ?? []).filter((u) => !allExcluded.includes(u.id));
      setUsers(filtered.slice(0, 10));
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open]);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setUsers([]);
      setSentTo(new Set());
      setCopied(false);
    }
  }, [open]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareWithUser = async (recipient: UserResult) => {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: recipient.id,
        type: shareType,
        item_id: itemId,
      }),
    });

    if (res.ok) {
      setSentTo((prev) => new Set(prev).add(recipient.id));
      showToast(`Gedeeld met ${recipient.display_name || 'gebruiker'}`);
      setTimeout(() => onClose(), 1500);
    } else {
      showToast('Delen mislukt. Probeer het opnieuw.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Deel met...">
      <div className="space-y-4">
        {/* External share options */}
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
            {copied ? 'Gekopieerd!' : 'Kopieer link'}
          </button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={handleNativeShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100"
            >
              <Send className="h-4 w-4" />
              Deel extern
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-text-muted">of deel met een gebruiker</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* User search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam..."
            className="w-full rounded-xl border border-gray-200 bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
        </div>

        {/* User results */}
        <div className="min-h-[120px] max-h-48 overflow-y-auto">
          {searching && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {!searching && search.length > 0 && users.length === 0 && (
            <p className="py-4 text-center text-sm text-text-muted">Geen gebruikers gevonden</p>
          )}
          {users.map((u) => {
            const isSent = sentTo.has(u.id);
            return (
              <button
                key={u.id}
                onClick={() => !isSent && handleShareWithUser(u)}
                disabled={isSent}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <span className="flex-1 text-sm font-medium text-text-primary">
                  {u.display_name || 'Anoniem'}
                </span>
                {isSent ? (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Check className="h-3.5 w-3.5" />
                    Verstuurd
                  </span>
                ) : (
                  <Send className="h-4 w-4 text-text-muted" />
                )}
              </button>
            );
          })}
        </div>

        {/* Toast inside modal */}
        {toast && (
          <div className="rounded-lg bg-gray-800 px-3 py-2 text-center text-sm text-white">
            {toast}
          </div>
        )}
      </div>
    </Modal>
  );
}
