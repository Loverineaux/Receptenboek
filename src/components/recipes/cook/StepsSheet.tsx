'use client';

import { Check } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';

interface StepsSheetProps {
  open: boolean;
  onClose: () => void;
  steps: Array<{ titel?: string | null; beschrijving: string }>;
  /** -1 = ingredient overview */
  currentStep: number;
  /** Step indexes that have a running timer */
  runningSteps: number[];
  onSelect: (step: number) => void;
}

/** Overview of all steps; tap to jump. */
export default function StepsSheet({ open, onClose, steps, currentStep, runningSteps, onSelect }: StepsSheetProps) {
  const pick = (i: number) => {
    onSelect(i);
    onClose();
  };

  const rowClass = (active: boolean) =>
    `flex min-h-[56px] w-full items-center gap-3.5 rounded-btn px-3 py-2.5 text-left transition-colors ${
      active ? 'bg-primary-tint' : 'hover:bg-sunk'
    }`;

  return (
    <BottomSheet open={open} onClose={onClose} title="Alle stappen">
      <div className="space-y-1 pb-2">
        <button type="button" onClick={() => pick(-1)} className={rowClass(currentStep === -1)}>
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
            <Check className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <span className="text-[15px] font-semibold text-ink">Ingrediënten</span>
        </button>
        {steps.map((s, i) => (
          <button key={i} type="button" onClick={() => pick(i)} className={rowClass(currentStep === i)}>
            <span
              className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular ${
                currentStep === i ? 'bg-primary text-on-primary' : 'bg-primary-tint text-primary'
              }`}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              {s.titel && <span className="block truncate text-[15px] font-semibold text-ink">{s.titel}</span>}
              <span className={`line-clamp-2 text-[14px] text-ink-2 ${s.titel ? '' : 'font-medium'}`}>
                {s.beschrijving}
              </span>
            </span>
            {runningSteps.includes(i) && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">
                Timer
              </span>
            )}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
