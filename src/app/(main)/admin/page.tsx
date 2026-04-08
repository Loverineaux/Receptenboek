'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ChefHat, MessageCircle, FolderOpen, Apple, Package, UserPlus } from 'lucide-react';

interface Stats {
  users: number;
  recipes: number;
  comments: number;
  collections: number;
  ingredients: number;
  products: number;
  recentSignups: number;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
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
      </div>
    </div>
  );
}
