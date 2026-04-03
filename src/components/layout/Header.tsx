'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChefHat, User, LogOut,
  BookOpen, Soup, FolderOpen, Heart, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { href: '/recepten', label: 'Recepten', icon: BookOpen },
  { href: '/suggesties', label: 'Wat koken?', icon: Soup },
  { href: '/collecties', label: 'Collecties', icon: FolderOpen },
  { href: '/favorieten', label: 'Favorieten', icon: Heart },
  { href: '/ontdek', label: 'Nieuwste', icon: Sparkles },
];

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close user menu on outside click
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

  return (
    <>
      {/* ── Top header ──────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-primary">Receptenboek</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname.startsWith(link.href) ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User menu (desktop + mobile) */}
          <div ref={userMenuRef}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-gray-100 md:pr-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light text-primary md:h-9 md:w-9">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name || ''}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </div>
                  <span className="hidden text-sm font-medium text-text-primary md:inline">
                    {profile?.display_name || 'Gebruiker'}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-4 mt-2 w-48 rounded-lg border bg-surface py-1 shadow-lg sm:right-6">
                    <div className="border-b px-4 py-2">
                      <p className="text-sm font-medium text-text-primary">
                        {profile?.display_name || 'Gebruiker'}
                      </p>
                      <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                    <Link
                      href="/profiel"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profiel
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Uitloggen
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Inloggen
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ───────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-surface md:hidden">
        <div className="flex items-stretch justify-around">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-text-muted'}`} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
