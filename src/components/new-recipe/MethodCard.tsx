'use client';

import { ReactNode } from 'react';

interface MethodCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/** Radio-kaart voor "Hoe wil je beginnen?" (design v2): r22, rand 1.5px, geselecteerd = primary. */
export default function MethodCard({ icon, title, description, selected, disabled, onSelect }: MethodCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full items-center gap-3.5 rounded-card-lg border-[1.5px] bg-surface p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        selected ? 'border-primary' : 'border-line'
      }`}
    >
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-icon-btn bg-primary-tint text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[13.5px] text-ink-3">{description}</span>
      </span>
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
          selected ? 'border-primary' : 'border-line-strong'
        }`}
      >
        {selected && <span className="h-3 w-3 rounded-full bg-primary" />}
      </span>
    </button>
  );
}
