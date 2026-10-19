'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { formatTimer } from '@/lib/cooking/durations';

interface TimerCardProps {
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
  onToggle: () => void;
}

export default function TimerCard({ label, totalSeconds, remainingSeconds, running, onToggle }: TimerCardProps) {
  const done = remainingSeconds === 0 && totalSeconds > 0;
  const pct = totalSeconds > 0 ? Math.round((1 - remainingSeconds / totalSeconds) * 100) : 0;
  const actionLabel = done ? 'Timer opnieuw starten' : running ? 'Timer pauzeren' : 'Timer starten';

  return (
    <div className="relative mt-[22px] flex items-center gap-3.5 overflow-hidden rounded-[24px] border border-on-primary/[0.12] bg-on-primary/[0.07] py-4 pl-5 pr-4">
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-cook-muted">{done ? `${label} · klaar` : label}</div>
        <div
          role="timer"
          aria-live="off"
          className="tabular text-[46px] font-medium leading-[1.1] tracking-[-0.02em]"
        >
          {formatTimer(remainingSeconds)}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={actionLabel}
        className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-on-primary text-cook-bg transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cook-accent"
      >
        {done ? (
          <RotateCcw className="h-5 w-5" strokeWidth={2.2} />
        ) : running ? (
          <Pause className="h-5 w-5" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play className="h-5 w-5" fill="currentColor" strokeWidth={0} />
        )}
      </button>
      <div
        className="absolute bottom-0 left-0 h-[3px] bg-cook-accent transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
