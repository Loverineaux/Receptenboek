'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ChefHat, MessageCircle, FolderOpen, Apple, Package, UserPlus, Sparkles, Heart } from 'lucide-react';

interface Stats {
  users: number;
  recipes: number;
  comments: number;
  collections: number;
  ingredients: number;
  products: number;
  recentSignups: number;
}

interface ExtractionUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  extraction_count: number;
  total_donated: number;
  donation_free_until: number;
  next_donation_at: number;
  extractions_until_donation: number;
}

interface ExtractionStats {
  users: ExtractionUser[];
  totalExtractions: number;
  totalDonated: number;
}

function StatCard({ icon: Icon, label, value, color, onClick }: { icon: any; label: string; value: number | string; color: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-gray-200 bg-surface p-4 text-left transition-colors hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [extractionStats, setExtractionStats] = useState<ExtractionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [donationUserId, setDonationUserId] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState('2.50');
  const [donationSaving, setDonationSaving] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => r.json()),
      fetch('/api/admin/extraction-stats').then((r) => r.json()),
    ]).then(([s, e]) => {
      setStats(s);
      setExtractionStats(e);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleRegisterDonation = async () => {
    if (!donationUserId || !donationAmount) return;
    setDonationSaving(true);
    try {
      await fetch('/api/admin/extraction-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: donationUserId, amount: parseFloat(donationAmount) }),
      });
      setDonationUserId(null);
      setDonationAmount('2.50');
      fetchData();
    } finally {
      setDonationSaving(false);
    }
  };

  if (loading || !stats) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Gebruikers" value={stats.users} color="bg-blue-500" onClick={() => router.push('/admin/gebruikers')} />
        <StatCard icon={ChefHat} label="Recepten" value={stats.recipes} color="bg-primary" onClick={() => router.push('/admin/recepten')} />
        <StatCard icon={MessageCircle} label="Reacties" value={stats.comments} color="bg-indigo-500" onClick={() => router.push('/admin/reacties')} />
        <StatCard icon={FolderOpen} label="Collecties" value={stats.collections} color="bg-purple-500" onClick={() => router.push('/admin/collecties')} />
        <StatCard icon={Apple} label="Ingrediënten" value={stats.ingredients} color="bg-orange-500" />
        <StatCard icon={Package} label="Producten" value={stats.products} color="bg-cyan-500" />
        <StatCard icon={UserPlus} label="Nieuwe leden (7d)" value={stats.recentSignups} color="bg-green-500" onClick={() => router.push('/admin/gebruikers')} />
        {extractionStats && (
          <>
            <StatCard icon={Sparkles} label="Totaal extracties" value={extractionStats.totalExtractions} color="bg-amber-500" />
            <StatCard icon={Heart} label="Totaal gedoneerd" value={`€${extractionStats.totalDonated.toFixed(2)}`} color="bg-pink-500" />
          </>
        )}
      </div>

      {/* Extraction stats per user */}
      {extractionStats && extractionStats.users.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">AI-extracties per gebruiker</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-text-muted">
                  <th className="px-3 py-3">Gebruiker</th>
                  <th className="px-3 py-3 text-center">Extracties</th>
                  <th className="px-3 py-3 text-center">Gedoneerd</th>
                  <th className="px-3 py-3 text-center">Popup</th>
                  <th className="px-3 py-3 text-center">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {extractionStats.users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Users className="h-3.5 w-3.5 text-text-muted" />
                          )}
                        </div>
                        <span className="font-medium text-text-primary">{u.display_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-text-primary">{u.extraction_count}</td>
                    <td className="px-3 py-3 text-center">
                      {u.total_donated > 0 ? (
                        <span className="font-medium text-green-600">€{u.total_donated.toFixed(2)}</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {u.extraction_count < u.donation_free_until ? (
                        <span className="text-xs text-green-600">vrij tot #{u.donation_free_until}</span>
                      ) : u.extractions_until_donation === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Nu zichtbaar
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">over {u.extractions_until_donation}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setDonationUserId(u.id)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        + Donatie
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Donation registration modal */}
      {donationUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setDonationUserId(null)}>
          <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary">Donatie registreren</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Voor {extractionStats?.users.find((u) => u.id === donationUserId)?.display_name || 'gebruiker'}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              €1 = 10 extracties zonder popup
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Bedrag (€)</label>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleRegisterDonation}
                disabled={donationSaving}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {donationSaving ? 'Opslaan...' : 'Registreren'}
              </button>
              <button
                type="button"
                onClick={() => setDonationUserId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
