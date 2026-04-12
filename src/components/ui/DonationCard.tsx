'use client';

import { useState, useEffect } from 'react';
import { Heart, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
  const [creatorAvatar, setCreatorAvatar] = useState<string | null>(null);

  // Fetch creator (admin) avatar
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('role', 'admin')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setCreatorAvatar(data.avatar_url);
      });
  }, []);

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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
          {creatorAvatar ? (
            <img src={creatorAvatar} alt="Robin" className="h-full w-full object-cover" />
          ) : (
            <Heart className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-primary">
            {isFirst
              ? 'Hey! Je eerste recept is geëxtraheerd!'
              : `Al ${extractionCount} recepten geëxtraheerd!`}
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">
            Ik ben Robin, de maker van Receptenboek. Elke extractie kost een paar cent aan AI.
            Vind je de app handig? Met een kleine bijdrage via PayPal help je mij de kosten te dekken.
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
