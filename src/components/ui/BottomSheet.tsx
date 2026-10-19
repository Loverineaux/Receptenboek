'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Vaste onderbalk (bijv. "Klaar"-knop), blijft zichtbaar bij scrollen */
  footer?: ReactNode;
}

/**
 * Bottom sheet (design v2, scherm 06): overlay rgba(18,24,18,.5), sheet radius 30
 * boven, grabber 40×5, slide-up 250ms. Sluiten via overlay-tik, Escape of
 * grabber naar beneden vegen. Op desktop (md+) verschijnt hij als gecentreerd paneel.
 */
export default function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onTouchEnd = () => {
    if (dragY > 90) onClose();
    setDragY(0);
    dragStart.current = null;
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-[rgba(18,24,18,0.5)]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className="relative flex max-h-[88vh] w-full max-w-lg animate-sheet-up flex-col rounded-t-sheet bg-background shadow-sheet md:rounded-sheet"
      >
        <div
          className="flex shrink-0 justify-center pb-1 pt-2.5 md:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-[5px] w-10 rounded-full bg-line-strong" />
        </div>

        {title && (
          <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-3 md:pt-5">
            <h2 className="font-display text-section font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sunk text-ink hover:bg-line"
            >
              <X className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

        {footer && (
          <div className="shrink-0 px-5 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
