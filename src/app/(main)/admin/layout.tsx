'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, ChefHat, MessageCircle, FolderOpen, Bell, Settings, Loader2, ShieldAlert, Apple } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/gebruikers', label: 'Gebruikers', icon: Users },
  { href: '/admin/recepten', label: 'Recepten', icon: ChefHat },
  { href: '/admin/reacties', label: 'Reacties', icon: MessageCircle },
  { href: '/admin/collecties', label: 'Collecties', icon: FolderOpen },
  { href: '/admin/ingredienten', label: 'Ingrediënten', icon: Apple },
  { href: '/admin/meldingen', label: 'Meldingen', icon: Bell },
  { href: '/admin/instellingen', label: 'Instellingen', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, loading } = useAdmin();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div>
      {/* Admin header */}
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">Admin Paneel</span>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-surface p-1">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:bg-gray-100 hover:text-text-primary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
