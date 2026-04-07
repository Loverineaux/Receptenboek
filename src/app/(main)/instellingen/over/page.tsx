'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ChefHat, Code, Heart } from 'lucide-react';

const APP_VERSION = process.env.APP_VERSION || '0.0.0';

export default function OverPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      <button
        onClick={() => router.push('/instellingen')}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Instellingen
      </button>

      {/* App icon + name */}
      <div className="mb-8 flex flex-col items-center pt-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <ChefHat className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-text-primary">Receptenboek</h1>
        <p className="mt-1 text-sm text-text-muted">Versie {APP_VERSION}</p>
      </div>

      {/* Description */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-4">
        <p className="text-sm leading-relaxed text-text-secondary">
          Receptenboek is een persoonlijke recepten-app waarmee je recepten kunt opslaan,
          organiseren in collecties, en delen met familie en vrienden. Ontdek nieuwe
          gerechten, bewaar je favorieten en kook samen.
        </p>
      </div>

      {/* Details */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm text-text-muted">Versie</p>
          <p className="text-sm font-medium text-text-primary">{APP_VERSION}</p>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm text-text-muted">Platform</p>
          <p className="text-sm font-medium text-text-primary">Next.js + Supabase</p>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-text-muted">Gemaakt door</p>
          <p className="text-sm font-medium text-text-primary">Robin Lovink</p>
        </div>
      </div>

      {/* Credits */}
      <div className="mt-8 flex flex-col items-center gap-1 text-center">
        <p className="flex items-center gap-1 text-xs text-text-muted">
          Gemaakt met <Heart className="h-3 w-3 text-red-400" /> en <Code className="h-3 w-3 text-text-muted" />
        </p>
        <p className="text-[11px] text-text-muted/60">
          &copy; {new Date().getFullYear()} Robin Lovink. Alle rechten voorbehouden.
        </p>
      </div>
    </div>
  );
}
