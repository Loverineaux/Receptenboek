import Link from 'next/link';
import { ArrowLeft, ChefHat, Code, Heart, Sparkles, Coffee } from 'lucide-react';
import { releaseNotes } from '@/lib/release-notes';

const APP_VERSION = process.env.APP_VERSION || '0.0.0';

export default function OverPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24">
      <div className="sticky top-14 z-20 -mx-4 bg-background px-4 pb-2 pt-4 md:top-16">
        <Link
          href="/instellingen"
          className="flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Instellingen
        </Link>
      </div>

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

      {/* Release notes */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          <Sparkles className="h-4 w-4 text-primary" />
          Wat is er nieuw?
        </h2>
        <div className="space-y-4">
          {releaseNotes.slice(0, 3).map((release) => (
            <div
              key={release.version}
              className="overflow-hidden rounded-xl border border-gray-200 bg-surface"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                <span className="text-sm font-semibold text-primary">v{release.version}</span>
                <span className="text-xs text-text-muted">{release.date}</span>
              </div>
              <ul className="px-4 py-3">
                {release.highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 py-1 text-sm text-text-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Donatie */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          <Coffee className="h-4 w-4 text-primary" />
          Steun dit project
        </h2>
        <div className="overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm leading-relaxed text-text-secondary">
            Receptenboek gebruikt AI om recepten te extraheren uit URL&apos;s, foto&apos;s en
            PDF&apos;s. Dat kost per extractie een paar cent aan API-kosten. Met een kleine
            donatie help je dit project draaiende te houden.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <a
              href="https://paypal.me/Receptenboek/2,50"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Heart className="h-4 w-4" />
              Doneer &euro;2,50
            </a>
            <a
              href="https://paypal.me/Receptenboek"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-muted underline-offset-2 hover:text-text-secondary hover:underline"
            >
              Ander bedrag
            </a>
          </div>
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
