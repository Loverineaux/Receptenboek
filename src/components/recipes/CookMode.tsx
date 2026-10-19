'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChefHat, ChevronLeft, List, Mic, Square, Timer, Volume2, X } from 'lucide-react';
import RecipeChat, { type ChatMessage } from '@/components/recipes/RecipeChat';
import Chip from '@/components/ui/Chip';
import IconButton from '@/components/ui/IconButton';
import TimerCard from '@/components/recipes/cook/TimerCard';
import StepsSheet from '@/components/recipes/cook/StepsSheet';
import { useCookTimers } from '@/components/recipes/cook/useCookTimers';
import { useWakeLock } from '@/components/recipes/cook/useWakeLock';
import type { RecipeWithRelations } from '@/types';
import { readCookStep, writeCookStep, clearCookSession } from '@/lib/recipe-session';
import { parseStepDuration, formatTimer } from '@/lib/cooking/durations';
import { matchStepIngredients } from '@/lib/cooking/ingredient-match';
import { canSpeak, notifyTimerDone, speak, stopSpeaking } from '@/lib/cooking/alerts';

interface CookModeProps {
  title: string;
  steps: Array<{ titel?: string | null; beschrijving: string }>;
  /** Amounts are expected to be already scaled to `portions`. */
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

function amountOf(ing: { hoeveelheid?: string | null; eenheid?: string | null }): string {
  return [ing.hoeveelheid, ing.eenheid].map((s) => (s ?? '').toString().trim()).filter(Boolean).join(' ');
}

function stepFontSize(text: string): string {
  if (text.length > 260) return 'text-[22px]';
  if (text.length > 160) return 'text-[26px]';
  return 'text-[30px]';
}

export default function CookMode({
  title, steps, ingredients, portions, onClose, recipe, recipeId, chatMessages, onChatMessagesChange,
}: CookModeProps) {
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
  // Suggestie-chips openen de chat én sturen hun vraag direct mee
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const askChef = (question: string) => {
    setPendingQuestion(question);
    setChatOpen(true);
  };
  const [stepsOpen, setStepsOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const totalSteps = steps.length;
  const wakeLockActive = useWakeLock();

  // Per-step derived data: duration + mentioned ingredients
  const stepMeta = useMemo(
    () =>
      steps.map((s) => {
        const text = s.beschrijving ?? '';
        return {
          duration: parseStepDuration(text),
          ingredientIdx: matchStepIngredients(text, ingredients),
        };
      }),
    [steps, ingredients]
  );

  const stepMetaRef = useRef(stepMeta);
  stepMetaRef.current = stepMeta;
  const handleTimerDone = useCallback((stepIdx: number) => {
    const label = stepMetaRef.current[stepIdx]?.duration?.label ?? 'Timer';
    notifyTimerDone('Timer klaar', `${label} (stap ${stepIdx + 1}) is klaar`);
    announceRef.current?.(`${label} klaar, stap ${stepIdx + 1}`);
  }, []);
  const announceRef = useRef<((m: string) => void) | null>(null);

  const timers = useCookTimers(currentStep, handleTimerDone);
  announceRef.current = timers.announce;

  const goTo = useCallback(
    (idx: number) => setCurrentStep(Math.max(-1, Math.min(idx, totalSteps - 1))),
    [totalSteps]
  );
  const goNext = useCallback(() => setCurrentStep((p) => Math.min(p + 1, totalSteps - 1)), [totalSteps]);
  const goPrev = useCallback(() => setCurrentStep((p) => Math.max(p - 1, -1)), []);

  // Write the current step to storage whenever it changes, so a backgrounded
  // PWA resumes where the user was when they switched apps.
  useEffect(() => {
    if (!recipeId) return;
    writeCookStep(recipeId, currentStep);
  }, [currentStep, recipeId]);

  // Stop reading aloud when the step changes or the component unmounts
  useEffect(() => {
    stopSpeaking();
    setSpeaking(false);
  }, [currentStep]);
  useEffect(() => () => stopSpeaking(), []);

  // Keyboard navigation — skip when typing in chat input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (stepsOpen) return; // BottomSheet handles Escape itself

      if (e.key === 'ArrowRight' || e.key === ' ') {
        // Let Space activate a focused button normally
        if (e.key === ' ' && tag === 'BUTTON') return;
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        if (chatOpen) setChatOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose, chatOpen, stepsOpen]);

  // Swipe support — only when chat/sheet are closed
  useEffect(() => {
    if (chatOpen || stepsOpen) return;
    let startX = 0;
    let startY = 0;
    let ignore = false;
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      ignore = !!(e.target as HTMLElement | null)?.closest?.('[data-no-swipe]');
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (ignore) return;
      const dx = startX - e.changedTouches[0].clientX;
      const dy = startY - e.changedTouches[0].clientY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) goNext();
        else goPrev();
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [goNext, goPrev, chatOpen, stepsOpen]);

  const isIngredients = currentStep === -1;
  const isLastStep = currentStep === totalSteps - 1;
  const step = !isIngredients ? steps[currentStep] : null;
  const meta = !isIngredients ? stepMeta[currentStep] : null;
  const stepIngredients = (meta?.ingredientIdx ?? []).map((i) => ingredients[i]).filter(Boolean);
  const duration = meta?.duration ?? null;
  const otherRunning = timers.runningSteps.filter((s) => s !== currentStep);

  const finish = () => {
    // Register as cooked (best effort), then wipe persisted state and close.
    if (recipeId) {
      fetch(`/api/recipes/${recipeId}/cooked`, { method: 'POST', keepalive: true }).catch((err) =>
        console.error('Gekookt-registratie mislukt:', err)
      );
      clearCookSession(recipeId);
    }
    onClose();
  };

  const toggleSpeech = () => {
    if (!step) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak([step.titel, step.beschrijving].filter(Boolean).join('. '), () => setSpeaking(false));
  };

  const replaceName = stepIngredients[0]?.naam.split(',')[0].trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 bg-cook-bg text-on-primary">
      <div className="mx-auto flex h-full w-full max-w-[640px] flex-col">
        {/* Header */}
        <div
          className="flex shrink-0 items-center gap-3 px-5 pt-2"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
        >
          <IconButton variant="dark" label="Kookmodus sluiten" onClick={onClose}>
            <X className="h-[19px] w-[19px]" strokeWidth={2} />
          </IconButton>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-[14px] font-semibold">{title}</div>
            {wakeLockActive && <div className="mt-0.5 text-[12.5px] text-cook-muted">Scherm blijft aan</div>}
          </div>
          <IconButton variant="dark" label="Alle stappen" onClick={() => setStepsOpen(true)}>
            <List className="h-[19px] w-[19px]" strokeWidth={2} />
          </IconButton>
        </div>

        {/* Segmented progress */}
        <div className="flex shrink-0 gap-[5px] px-5 pt-[18px]" role="progressbar" aria-label="Voortgang" aria-valuemin={0} aria-valuemax={totalSteps} aria-valuenow={currentStep + 1}>
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ga naar stap ${i + 1}`}
              className="-my-3 flex-1 py-3"
            >
              <span
                className={`block h-1 rounded-[2px] transition-colors duration-200 ${
                  i < currentStep ? 'bg-cook-accent' : i === currentStep ? 'bg-on-primary' : 'bg-white/[0.18]'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col px-6 pt-[30px]">
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
            {isIngredients ? (
              <>
                <div className="text-overline font-semibold uppercase text-cook-accent">Ingrediënten</div>
                <h2 className="mt-3.5 font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-pretty">
                  {title}
                </h2>
                <p className="mt-1.5 text-[14px] text-cook-muted">
                  {portions} {portions === 1 ? 'portie' : 'porties'}
                </p>
                <ul className="mt-5 divide-y divide-on-primary/10 overflow-hidden rounded-[20px] border border-on-primary/[0.12] bg-on-primary/[0.07]">
                  {ingredients.map((ing, idx) => (
                    <li key={idx} className="flex min-h-[48px] items-center gap-3 px-4 py-2.5 text-[15px]">
                      <span className="tabular w-[84px] shrink-0 font-semibold">{amountOf(ing)}</span>
                      <span className="text-cook-soft">{ing.naam}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : step ? (
              <>
                <div className="text-overline font-semibold uppercase text-cook-accent">
                  Stap {currentStep + 1} van {totalSteps}
                </div>
                {step.titel && <div className="mt-3 text-[15px] font-semibold text-cook-soft">{step.titel}</div>}
                <p
                  className={`font-display font-semibold leading-[1.12] tracking-[-0.03em] text-pretty ${stepFontSize(
                    step.beschrijving
                  )} ${step.titel ? 'mt-2' : 'mt-3.5'}`}
                >
                  {step.beschrijving}
                </p>

                {stepIngredients.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {stepIngredients.map((ing, i) => {
                      const amount = amountOf(ing);
                      return (
                        <span
                          key={i}
                          className="flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-chip border border-on-primary/[0.16] bg-on-primary/[0.08] px-[13px] text-[14px]"
                        >
                          {amount && <strong className="tabular font-semibold">{amount}</strong>}
                          <span className="text-cook-soft">{ing.naam.toLowerCase()}</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {duration && (
                  <TimerCard
                    label={duration.label}
                    totalSeconds={duration.seconds}
                    remainingSeconds={timers.remainingSeconds(currentStep, duration.seconds)}
                    running={timers.isRunning(currentStep)}
                    onToggle={() => timers.toggle(currentStep, duration.seconds)}
                  />
                )}

                {otherRunning.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2" data-no-swipe>
                    {otherRunning.map((s) => {
                      const d = stepMeta[s]?.duration;
                      if (!d) return null;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => goTo(s)}
                          aria-label={`Terug naar stap ${s + 1}, ${d.label} loopt nog`}
                          className="flex h-11 items-center gap-2 rounded-chip border border-cook-accent/40 bg-cook-accent/10 px-3.5 text-[13px] text-cook-soft"
                        >
                          <Timer className="h-4 w-4 text-cook-accent" />
                          <span>{d.label}</span>
                          <span className="tabular font-semibold">
                            {formatTimer(timers.remainingSeconds(s, d.seconds))}
                          </span>
                          <span className="text-cook-muted">· stap {s + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Suggestions + chef input */}
          {!isIngredients && (
            <div className="shrink-0 pt-3">
              <div className="-mx-6 mb-2.5 flex gap-2 overflow-x-auto px-6 scrollbar-none" data-no-swipe>
                {recipe && replaceName && (
                  <Chip tone="dark" onClick={() => askChef(`Waarmee kan ik ${replaceName} vervangen in deze stap?`)}>
                    {replaceName.charAt(0).toUpperCase() + replaceName.slice(1)} vervangen?
                  </Chip>
                )}
                {recipe && (
                  <Chip tone="dark" onClick={() => askChef('Het is te dik geworden, wat kan ik nu doen?')}>
                    Te dik, wat nu?
                  </Chip>
                )}
                {canSpeak() && (
                  <Chip
                    tone="dark"
                    onClick={toggleSpeech}
                    aria-pressed={speaking}
                    icon={speaking ? <Square className="h-3.5 w-3.5" fill="currentColor" /> : <Volume2 className="h-4 w-4" />}
                  >
                    {speaking ? 'Stop voorlezen' : 'Lees voor'}
                  </Chip>
                )}
              </div>
            </div>
          )}
          {recipe && (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              aria-label="Vraag de chef"
              className="mt-0 flex h-14 w-full shrink-0 items-center gap-3 rounded-[20px] bg-on-primary/[0.08] pl-2 pr-1.5 text-left transition-colors hover:bg-on-primary/[0.12]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-primary">
                <ChefHat className="h-5 w-5 text-on-primary" strokeWidth={1.9} />
              </span>
              <span className="flex-1 text-[15px] text-cook-muted">Vraag de chef…</span>
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px]">
                <Mic className="h-5 w-5 text-on-primary" strokeWidth={1.9} />
              </span>
            </button>
          )}
        </div>

        {/* Navigation */}
        <div
          className="flex shrink-0 gap-2.5 px-5 pt-3.5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 22px)' }}
        >
          <button
            type="button"
            onClick={goPrev}
            disabled={isIngredients}
            aria-label={currentStep === 0 ? 'Terug naar ingrediënten' : 'Vorige stap'}
            className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-[22px] border border-on-primary/[0.22] transition-opacity disabled:opacity-35"
          >
            <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={2} />
          </button>
          {isLastStep ? (
            <button
              type="button"
              onClick={finish}
              className="flex h-[62px] flex-1 items-center justify-center gap-2 rounded-[22px] bg-on-primary text-[17px] font-semibold text-cook-bg transition-transform active:scale-[0.98]"
            >
              Eet smakelijk
              <Check className="h-5 w-5" strokeWidth={2.4} />
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="flex h-[62px] flex-1 items-center justify-center gap-2 rounded-[22px] bg-on-primary text-[17px] font-semibold text-cook-bg transition-transform active:scale-[0.98]"
            >
              {isIngredients ? 'Start met koken' : 'Volgende stap'}
              <ArrowRight className="h-5 w-5" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* Screen reader announcements for timers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {timers.announcement}
      </div>

      <StepsSheet
        open={stepsOpen}
        onClose={() => setStepsOpen(false)}
        steps={steps}
        currentStep={currentStep}
        runningSteps={timers.runningSteps}
        onSelect={goTo}
      />

      {/* Chat slide-in panel from right */}
      {recipe && (
        <>
          <div
            className={`absolute inset-0 z-20 bg-black/40 transition-opacity duration-200 ${
              chatOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setChatOpen(false)}
          />
          <div
            aria-hidden={!chatOpen}
            className={`absolute bottom-0 right-0 top-0 z-30 flex w-full max-w-md flex-col bg-surface text-ink shadow-2xl transition-transform duration-300 ease-out ${
              chatOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary">
                  <ChefHat className="h-4 w-4 text-on-primary" />
                </span>
                <span className="text-sm font-semibold">Vraag de chef</span>
              </div>
              <IconButton variant="sunk" label="Chat sluiten" onClick={() => setChatOpen(false)}>
                <X className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </IconButton>
            </div>
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
                pendingQuestion={pendingQuestion}
                onPendingQuestionHandled={() => setPendingQuestion(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
