'use client';

import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ChefHat, Bot } from 'lucide-react';
import RecipeChat, { type ChatMessage } from '@/components/recipes/RecipeChat';
import type { RecipeWithRelations } from '@/types';
import { readCookStep, writeCookStep, clearCookSession } from '@/lib/recipe-session';

interface CookModeProps {
  title: string;
  steps: Array<{ titel?: string | null; beschrijving: string }>;
  ingredients: Array<{ hoeveelheid?: string | null; eenheid?: string | null; naam: string }>;
  portions: number;
  onClose: () => void;
  recipe?: RecipeWithRelations;
  /** When provided, currentStep is persisted per recipe so switching apps
   *  and returning restores the place you were at (24h TTL). */
  recipeId?: string;
  chatMessages?: ChatMessage[];
  onChatMessagesChange?: (messages: ChatMessage[]) => void;
}

export default function CookMode({ title, steps, ingredients, portions, onClose, recipe, recipeId, chatMessages, onChatMessagesChange }: CookModeProps) {
  // Lazy initializer so the persisted step is restored on the very first
  // render — no flash of "stap 1" before a useEffect catches up.
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === 'undefined' || !recipeId) return -1;
    const stored = readCookStep(recipeId);
    if (stored === null) return -1;
    // Guard against stale data pointing past the current step count
    if (stored >= steps.length) return -1;
    return stored;
  });
  const [chatOpen, setChatOpen] = useState(false);
  const totalSteps = steps.length;

  // Write the current step to storage whenever it changes, so a backgrounded
  // PWA resumes where the user was when they switched apps.
  useEffect(() => {
    if (!recipeId) return;
    writeCookStep(recipeId, currentStep);
  }, [currentStep, recipeId]);

  // Keep screen awake
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };
    requestWakeLock();
    return () => { wakeLock?.release(); };
  }, []);

  // Keyboard navigation — skip when typing in chat input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStep((prev) => Math.max(prev - 1, -1));
      } else if (e.key === 'Escape') {
        if (chatOpen) setChatOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [totalSteps, onClose, chatOpen]);

  // Swipe support — only when chat is closed
  useEffect(() => {
    if (chatOpen) return;
    let startX = 0;
    const handleTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const handleTouchEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 60) {
        if (diff > 0) setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
        else setCurrentStep((prev) => Math.max(prev - 1, -1));
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [totalSteps, chatOpen]);

  const isIngredients = currentStep === -1;
  const isLastStep = currentStep === totalSteps - 1;
  const step = !isIngredients ? steps[currentStep] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-text-primary">Kookmodus</span>
        </div>
        <div className="text-xs text-text-muted">
          {isIngredients ? 'Ingrediënten' : `Stap ${currentStep + 1} / ${totalSteps}`}
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <X className="h-5 w-5 text-text-secondary" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8">
        {isIngredients ? (
          <div className="w-full max-w-lg space-y-4">
            <h2 className="text-center text-xl font-bold text-text-primary">{title}</h2>
            <p className="text-center text-sm text-text-muted">{portions} porties</p>
            <div className="mt-6 space-y-2">
              {ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3 text-base"
                >
                  <span className="min-w-[3rem] font-semibold text-primary">
                    {ing.hoeveelheid || ''}
                  </span>
                  <span className="text-text-secondary">{ing.eenheid || ''}</span>
                  <span className="text-text-primary">{ing.naam}</span>
                </div>
              ))}
            </div>
          </div>
        ) : step ? (
          <div className="w-full max-w-lg space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
              {currentStep + 1}
            </div>
            {step.titel && (
              <h3 className="text-lg font-semibold text-text-primary">{step.titel}</h3>
            )}
            <p className="text-xl leading-relaxed text-text-primary">
              {step.beschrijving}
            </p>
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t bg-surface px-4 py-4">
        <button
          onClick={() => setCurrentStep((prev) => Math.max(prev - 1, -1))}
          disabled={isIngredients}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
          {currentStep === 0 ? 'Ingrediënten' : 'Vorige'}
        </button>

        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps + 1 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx - 1)}
              className={`h-2 rounded-full transition-all ${
                idx - 1 === currentStep
                  ? 'w-6 bg-primary'
                  : idx - 1 < currentStep
                    ? 'w-2 bg-primary/40'
                    : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {isLastStep ? (
          <button
            onClick={() => {
              // Finished cooking — wipe persisted step + checked ingredients
              // so the next open of this recipe starts with a clean slate.
              if (recipeId) clearCookSession(recipeId);
              onClose();
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Klaar!
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            {isIngredients ? 'Start' : 'Volgende'}
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* FAB — floating assistant button */}
      {recipe && !chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="absolute bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform active:scale-95"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat slide-in panel from right */}
      {recipe && (
        <>
          {/* Backdrop */}
          <div
            className={`absolute inset-0 z-20 bg-black/30 transition-opacity duration-200 ${
              chatOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setChatOpen(false)}
          />
          {/* Panel */}
          <div
            className={`absolute top-0 bottom-0 right-0 z-30 flex w-full max-w-md flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${
              chatOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-text-primary">Kookassistent</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>
            {/* Chat content */}
            <div className="flex-1 overflow-hidden">
              <RecipeChat
                recipe={recipe}
                compact
                cookModeContext={{
                  currentStep,
                  stepText: step?.beschrijving,
                  stepTitle: step?.titel ?? undefined,
                }}
                messages={chatMessages}
                onMessagesChange={onChatMessagesChange}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
