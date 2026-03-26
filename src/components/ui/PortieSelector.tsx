'use client';

import { Minus, Plus } from 'lucide-react';

interface PortieSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export default function PortieSelector({ value, onChange }: PortieSelectorProps) {
  const decrement = () => {
    if (value > 1) onChange(value - 1);
  };

  const increment = () => {
    if (value < 20) onChange(value + 1);
  };

  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={decrement}
        disabled={value <= 1}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-text-secondary transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus className="h-4 w-4" />
      </button>

      <span className="min-w-[2ch] text-center text-lg font-semibold text-text-primary">
        {value}
      </span>

      <button
        type="button"
        onClick={increment}
        disabled={value >= 20}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-text-secondary transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
