'use client';

import { Minus, Plus } from 'lucide-react';

interface PortieSelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/**
 * Portie-stepper (design v2): −/+ cirkels van 30px, + is bosgroen.
 * De knoppen hebben een 44px hoge klikzone rond de zichtbare cirkel.
 */
export default function PortieSelector({ value, onChange, min = 1, max = 12 }: PortieSelectorProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => value > min && onChange(value - 1)}
        disabled={value <= min}
        aria-label="Minder porties"
        className="group flex h-11 w-9 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line text-ink transition-colors group-hover:bg-sunk">
          <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
      </button>

      <span className="tabular text-[17px] font-semibold text-ink" aria-live="polite">
        {value}
      </span>

      <button
        type="button"
        onClick={() => value < max && onChange(value + 1)}
        disabled={value >= max}
        aria-label="Meer porties"
        className="group flex h-11 w-9 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary text-on-primary transition-colors group-hover:bg-primary-dark">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
      </button>
    </div>
  );
}
