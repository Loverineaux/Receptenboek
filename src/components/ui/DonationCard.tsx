'use client';

import { useState } from 'react';
import { Heart, X } from 'lucide-react';

interface DonationCardProps {
  /** Number of extractions the user has done */
  extractionCount: number;
  /** Compact mode for inline display */
  compact?: boolean;
}

const PAYPAL_URL = 'https://paypal.me/Receptenboek';
const SUGGESTED_AMOUNT = '2,50';

export default function DonationCard({ extractionCount, compact = false }: DonationCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isFirst = extractionCount === 1;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-primary/20 bg-surface shadow-lg ${compact ? 'p-3' : 'p-4'}`}>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-black/5 hover:text-text-secondary"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-primary">
            {isFirst
              ? 'Je eerste recept is geëxtraheerd met AI!'
              : `Al ${extractionCount} recepten geëxtraheerd met AI!`}
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">
            Elke extractie kost een paar cent aan AI-kosten.
            Vind je het handig? Een kleine bijdrage houdt dit draaiende.
          </p>
          <a
            href={`${PAYPAL_URL}/${SUGGESTED_AMOUNT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Heart className="h-3 w-3" />
            Doneer &euro;{SUGGESTED_AMOUNT}
          </a>
          <a
            href={PAYPAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-xs text-text-muted underline-offset-2 hover:text-text-secondary hover:underline"
          >
            Ander bedrag
          </a>
        </div>
      </div>
    </div>
  );
}
