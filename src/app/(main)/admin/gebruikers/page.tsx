'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, User, Shield, ShieldOff, KeyRound, Ban, CheckCircle, ChefHat, Crown } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  is_blocked: boolean;
  created_at: string;
  last_seen: string | null;
  recipe_count: number;
}

export default function AdminGebruikersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [search, users]);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => { setUsers(data); })
      .finally(() => setLoading(false));
  }, []);

  const handleBlock = (user: AdminUser) => {
    setConfirmAction({
      title: 'Gebruiker blokkeren',
      message: `Weet je zeker dat je ${user.display_name || user.email} wilt blokkeren? Deze persoon kan niet meer inloggen.`,
      onConfirm: async () => {
        setConfirmAction(null);
        await fetch(`/api/admin/users/${user.id}/block`, { method: 'POST' });
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_blocked: true } : u));
        showToast(`${user.display_name || 'Gebruiker'} is geblokkeerd`);
      },
    });
  };

  const handleUnblock = async (user: AdminUser) => {
    await fetch(`/api/admin/users/${user.id}/unblock`, { method: 'POST' });
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_blocked: false } : u));
    showToast(`${user.display_name || 'Gebruiker'} is gedeblokkeerd`);
  };

  const handleResetPassword = (user: AdminUser) => {
    setConfirmAction({
      title: 'Wachtwoord resetten',
      message: `Er wordt een reset e-mail gestuurd naar ${user.email}. Doorgaan?`,
      onConfirm: async () => {
        setConfirmAction(null);
        await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
        showToast(`Reset e-mail verstuurd naar ${user.email}`);
      },
    });
  };

  const handleRoleChange = (user: AdminUser, newRole: 'admin' | 'user') => {
    const label = newRole === 'admin' ? 'admin' : 'gebruiker';
    setConfirmAction({
      title: `Rol wijzigen naar ${label}`,
      message: `Weet je zeker dat je ${user.display_name || user.email} ${newRole === 'admin' ? 'admin rechten wilt geven' : 'wilt terugzetten naar gewone gebruiker'}?`,
      onConfirm: async () => {
        setConfirmAction(null);
        await fetch(`/api/admin/users/${user.id}/role`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        });
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
        showToast(`${user.display_name || 'Gebruiker'} is nu ${label}`);
      },
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatDateTime = (d: string) => new Date(d).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-text-primary">Gebruikers</h1>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam of e-mail..."
          className="w-full rounded-xl border border-gray-200 bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div
              key={u.id}
              className={`rounded-xl border bg-surface p-4 ${u.is_blocked ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <button onClick={() => router.push(`/profiel/${u.id}`)} className="flex-shrink-0">
                  <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-light">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt="" fill className="object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {u.display_name || 'Anoniem'}
                    </p>
                    {u.role === 'admin' && (
                      <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <Crown className="h-3 w-3" /> Admin
                      </span>
                    )}
                    {u.is_blocked && (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                        Geblokkeerd
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{u.email}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
                    <span><ChefHat className="mr-0.5 inline h-3 w-3" />{u.recipe_count} recepten</span>
                    <span>Lid sinds {formatDate(u.created_at)}</span>
                    {u.last_seen && <span>Actief {formatDateTime(u.last_seen)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-1">
                  {u.is_blocked ? (
                    <button
                      onClick={() => handleUnblock(u)}
                      className="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1.5 text-[11px] font-medium text-green-600 hover:bg-green-100"
                      title="Deblokkeren"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBlock(u)}
                      className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-100"
                      title="Blokkeren"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleResetPassword(u)}
                    className="flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5 text-[11px] font-medium text-text-muted hover:bg-gray-100"
                    title="Wachtwoord resetten"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </button>
                  {u.role === 'admin' ? (
                    <button
                      onClick={() => handleRoleChange(u, 'user')}
                      className="flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5 text-[11px] font-medium text-text-muted hover:bg-gray-100"
                      title="Maak gebruiker"
                    >
                      <ShieldOff className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRoleChange(u, 'admin')}
                      className="flex items-center gap-1 rounded-lg bg-primary/5 px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
                      title="Maak admin"
                    >
                      <Shield className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          open
          title={confirmAction.title}
          message={confirmAction.message}
          variant="danger"
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
