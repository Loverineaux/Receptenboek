'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ChefHat, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { href: '/recepten', label: 'Recepten' },
  { href: '/ontdek', label: 'Nieuwste' },
  { href: '/recepten/nieuw', label: 'Nieuw Recept' },
];

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-40 border-b bg-surface">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
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
              className="text-sm font-medium text-text-secondary transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop user menu */}
        <div className="hidden md:block" ref={userMenuRef}>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-gray-100"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light text-primary">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
                <span className="text-sm font-medium text-text-primary">
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

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="border-t bg-surface px-4 py-3 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <hr className="my-2" />
          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-text-muted" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {profile?.display_name || 'Gebruiker'}
                  </p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
              </div>
              <Link
                href="/profiel"
                className="block rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-gray-50"
                onClick={() => setMobileOpen(false)}
              >
                Profiel
              </Link>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary hover:bg-gray-50"
                onClick={() => {
                  setMobileOpen(false);
                  handleSignOut();
                }}
              >
                Uitloggen
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-gray-50"
              onClick={() => setMobileOpen(false)}
            >
              Inloggen
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
