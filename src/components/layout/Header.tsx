'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChefHat, LogOut, Settings, ShieldAlert, Plus, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import NotificationBell from '@/components/notifications/NotificationBell';

// Desktop heeft ruimte genoeg: Collecties krijgt hier wél een eigen link.
const navLinks = [
  { href: '/recepten', label: 'Recepten' },
  { href: '/suggesties', label: 'Wat koken?' },
  { href: '/favorieten', label: 'Favorieten' },
  { href: '/collecties', label: 'Collecties' },
  { href: '/ingredienten', label: 'Ingrediënten' },
];

/**
 * Desktop-bovenbalk (md+). Op mobiel heeft elk scherm zijn eigen kop volgens
 * design v2 en gebeurt navigatie via de BottomNav.
 */
export default function Header() {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    window.location.href = '/';
  };

  const initial = (profile?.display_name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <header className="bar-blur sticky top-0 z-40 hidden border-b border-line md:block">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-8 px-8">
        <Link href="/recepten" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-icon-btn bg-primary text-on-primary">
            <ChefHat className="h-[22px] w-[22px]" strokeWidth={2} />
          </span>
          <span className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">Receptenboek</span>
        </Link>

        <nav data-tour="desktop-nav" className="flex flex-1 items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-chip px-3.5 py-2 text-[15px] font-medium transition-colors ${
                  active ? 'bg-primary-tint text-primary' : 'text-ink-3 hover:bg-sunk hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/recepten/nieuw"
                className="mr-1 inline-flex h-10 items-center gap-1.5 rounded-icon-btn bg-primary px-4 text-[15px] font-semibold text-on-primary shadow-btn-primary hover:bg-primary-dark"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} />
                Nieuw recept
              </Link>
              <NotificationBell />
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="Accountmenu"
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-placeholder font-display text-lg font-semibold text-ink"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : profile ? (
                    initial
                  ) : (
                    <User className="h-5 w-5 text-ink-3" />
                  )}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-card border border-line bg-surface py-1 shadow-lg">
                    <div className="border-b border-line-soft px-4 py-3">
                      <p className="text-[15px] font-semibold text-ink">{profile?.display_name || 'Gebruiker'}</p>
                      <p className="truncate text-meta text-ink-3">{user.email}</p>
                    </div>
                    <Link
                      href="/profiel"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[15px] text-ink-2 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profiel
                    </Link>
                    <Link
                      href="/instellingen"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[15px] text-ink-2 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Instellingen
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[15px] text-primary hover:bg-primary-tint"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Admin
                      </Link>
                    )}
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[15px] text-ink-2 hover:bg-gray-50"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Uitloggen
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-icon-btn bg-primary px-4 text-[15px] font-semibold text-on-primary hover:bg-primary-dark"
            >
              Inloggen
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
