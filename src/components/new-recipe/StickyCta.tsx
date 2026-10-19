import { ReactNode } from 'react';

/** Sticky actiebalk onderaan (frosted zand, 1px top-border). Inhoud gecentreerd tot 640px. */
export default function StickyCta({ children }: { children: ReactNode }) {
  return (
    <div className="bar-blur fixed inset-x-0 bottom-0 z-30 border-t border-line px-gutter pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto max-w-[640px]">{children}</div>
    </div>
  );
}
