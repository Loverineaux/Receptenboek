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
  next_donation_at: number;
  extractions_until_donation: number;
}

interface ExtractionStats {
  users: ExtractionUser[];
  totalExtractions: number;
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

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => r.json()),
      fetch('/api/admin/extraction-stats').then((r) => r.json()),
    ]).then(([s, e]) => {
      setStats(s);
      setExtractionStats(e);
    }).finally(() => setLoading(false));
  }, []);

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
          <StatCard icon={Sparkles} label="Totaal extracties" value={extractionStats.totalExtractions} color="bg-amber-500" />
        )}
      </div>

      {/* Extraction stats per user */}
      {extractionStats && extractionStats.users.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">AI-extracties per gebruiker</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-text-muted">
                  <th className="px-4 py-3">Gebruiker</th>
                  <th className="px-4 py-3 text-center">Extracties</th>
                  <th className="px-4 py-3 text-center">Volgende donatie</th>
                  <th className="px-4 py-3 text-center">Nog te gaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {extractionStats.users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-center font-medium text-text-primary">{u.extraction_count}</td>
                    <td className="px-4 py-3 text-center text-text-secondary">bij #{u.next_donation_at}</td>
                    <td className="px-4 py-3 text-center">
                      {u.extractions_until_donation === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Heart className="h-3 w-3" /> Nu zichtbaar
                        </span>
                      ) : (
                        <span className="text-text-muted">{u.extractions_until_donation} extracties</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
