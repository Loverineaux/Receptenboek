'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Bot, Send, X } from 'lucide-react';
import type { RecipeWithRelations } from '@/types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CookModeContext {
  /** -1 = ingredients overview, 0+ = step index */
  currentStep: number;
  stepText?: string;
  stepTitle?: string;
}

interface RecipeChatProps {
  recipe: RecipeWithRelations;
  /** Compact mode for cook mode — always open, no collapse */
  compact?: boolean;
  /** Current cook mode step for contextual suggestions */
  cookModeContext?: CookModeContext;
  /** External messages state (for persisting across detail page / cook mode) */
  messages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

const DEFAULT_CHIPS = [
  'Wat kan ik als vervanging gebruiken?',
  'Hoe bewaar ik de restjes?',
  'Maak dit glutenvrij',
  'Tips voor beginners',
];

const BORING_INGREDIENTS = new Set([
  'water', 'zout', 'peper', 'olie', 'olijfolie', 'boter', 'bakboter',
  'zonnebloemolie', 'plantaardige olie', 'zwarte peper', 'zeezout',
]);

/** Extract meaningful ingredients mentioned in step text */
function extractFoodWords(text: string, recipeIngredients: { naam: string }[]): string[] {
  const lower = text.toLowerCase();
  return recipeIngredients
    .map((i) => i.naam?.toLowerCase().trim())
    .filter((naam): naam is string =>
      !!naam &&
      !BORING_INGREDIENTS.has(naam) &&
      lower.includes(naam.split(' ').pop()!)
    )
    .slice(0, 2);
}

function getSuggestionChips(recipe: RecipeWithRelations, ctx?: CookModeContext): string[] {
  if (!ctx) return DEFAULT_CHIPS;

  const ings = recipe.ingredients ?? [];

  if (ctx.currentStep === -1) {
    // Ingredients overview — ask about specific ingredients
    const chips: string[] = [];
    const interesting = ings.filter((i) => !BORING_INGREDIENTS.has(i.naam?.toLowerCase().trim()));
    if (interesting[0]) chips.push(`Waarvoor is de ${interesting[0].naam}?`);
    if (interesting[1]) chips.push(`Kan ik ${interesting[1].naam} vervangen?`);
    chips.push('Wat heb ik aan keukengerei nodig?');
    chips.push('Kan ik iets van tevoren klaarzetten?');
    return chips.slice(0, 4);
  }

  // On a specific step — extract context from step text
  const text = ctx.stepText || '';
  const lower = text.toLowerCase();
  const chips: string[] = [];

  // Find ingredients mentioned in this step
  const mentioned = extractFoodWords(text, ings);

  // Technique-specific questions with actual content
  if (/bak|braad|roerbak|grill|aanbraad/i.test(lower)) {
    chips.push(`Hoe zie ik dat ${mentioned[0] || 'het'} gaar is?`);
    chips.push('Welke pan gebruik ik het best?');
  } else if (/kook|sudder|pruttelen|opwarmen/i.test(lower)) {
    chips.push(`Wanneer is ${mentioned[0] || 'het'} klaar?`);
    if (/deksel|afgedekt/i.test(lower)) chips.push('Met of zonder deksel?');
  } else if (/snij|snijd|hakken|snipper|schil/i.test(lower)) {
    if (mentioned[0]) chips.push(`Hoe snijd ik ${mentioned[0]} het best?`);
    chips.push('Welk mes gebruik ik hiervoor?');
  } else if (/oven/i.test(lower)) {
    chips.push('Hoe weet ik of de oven heet genoeg is?');
    if (mentioned[0]) chips.push(`Hoe zie ik dat ${mentioned[0]} klaar is?`);
  } else if (/meng|mix|roer|klop/i.test(lower)) {
    chips.push('Hoe lang moet ik mengen?');
    if (mentioned[0]) chips.push(`Wat als ${mentioned[0]} klontert?`);
  } else if (/marineer|intrekken|rusten/i.test(lower)) {
    chips.push('Kan ik dit langer laten marineren?');
  }

  // If ingredients are mentioned, ask about them
  if (mentioned[0] && chips.length < 3) {
    chips.push(`Kan ik iets anders gebruiken dan ${mentioned[0]}?`);
  }

  // Always add a step-specific explainer
  chips.push(`Wat bedoelen ze precies met stap ${ctx.currentStep + 1}?`);

  // Fill up if needed
  if (chips.length < 3) chips.push('Waar moet ik op letten bij deze stap?');

  return chips.slice(0, 4);
}

/** Extract follow-up suggestions from AI response (after --- separator) */
function extractFollowUps(text: string): { body: string; followUps: string[] } {
  const separatorIdx = text.lastIndexOf('\n---');
  if (separatorIdx === -1) return { body: text, followUps: [] };

  const body = text.substring(0, separatorIdx).trimEnd();
  const afterSep = text.substring(separatorIdx + 4);
  const followUps = afterSep
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length < 60);

  return { body, followUps: followUps.slice(0, 4) };
}

/** Simple markdown renderer for chat messages: bold, italic, lists */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    // List items: "- text" or "* text"
    const listMatch = line.match(/^[-*]\s+(.+)/);
    const content = listMatch ? listMatch[1] : line;

    // Inline formatting: **bold** and *italic*
    const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const rendered = parts.map((part, pi) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pi}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={pi}>{part.slice(1, -1)}</em>;
      }
      return part;
    });

    if (listMatch) {
      return <div key={li} className="flex gap-1.5 pl-1"><span>•</span><span>{rendered}</span></div>;
    }
    if (line === '') {
      return <div key={li} className="h-2" />;
    }
    return <div key={li}>{rendered}</div>;
  });
}

export default function RecipeChat({
  recipe, compact = false, cookModeContext,
  messages: externalMessages, onMessagesChange,
}: RecipeChatProps) {
  const [open, setOpen] = useState(compact);
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);

  // Use external state if provided, otherwise internal
  const messages = externalMessages ?? internalMessages;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const setMessages = useMemo(() =>
    onMessagesChange
      ? (update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
          if (typeof update === 'function') {
            onMessagesChange(update(messagesRef.current));
          } else {
            onMessagesChange(update);
          }
        }
      : setInternalMessages,
    [onMessagesChange]
  );
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    // Add empty assistant message that we'll stream into
    const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMessage]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`/api/recipes/${recipe.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Onbekende fout' }));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `Fout: ${err.error || 'Kon geen antwoord genereren'}`,
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setIsStreaming(false);
        return;
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'delta') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data.text,
                };
                return updated;
              });
            } else if (data.type === 'error') {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: `Fout: ${data.message}`,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Verbinding verloren. Probeer het opnieuw.',
          };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const chatContent = (
    <div className={`flex flex-col ${compact ? 'h-full' : 'h-[400px]'}`}>
      {/* Messages area */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Bot className="h-8 w-8 text-primary/60" />
            <p className="text-sm text-text-muted">
              Stel me een vraag over dit recept.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 bg-gray-50 text-text-primary'
              }`}
            >
              {msg.role === 'assistant' ? renderMarkdown(extractFollowUps(msg.content).body) : msg.content}
              {/* Streaming cursor */}
              {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary/60" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      {!isStreaming && (() => {
        // Get AI follow-ups from last assistant message, or fall back to context-based chips
        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
        const aiFollowUps = lastAssistant ? extractFollowUps(lastAssistant.content).followUps : [];
        const chips = aiFollowUps.length > 0
          ? aiFollowUps
          : getSuggestionChips(recipe, cookModeContext);

        return chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 border-t px-3 pt-2 pb-1">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendMessage(chip)}
                className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null;
      })()}

      {/* Input area */}
      <div className="flex items-end gap-2 border-t p-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Stel een vraag..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={handleStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white transition-colors hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  // Compact mode (for cook mode) — no wrapper, just the chat content
  if (compact) {
    return (
      <div className="flex h-full flex-col bg-surface">
        {chatContent}
      </div>
    );
  }

  // Default: FAB + slide-in drawer from right
  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          data-tour="recipe-ai-chat"
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 bottom-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-text-primary">Kookassistent</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>
        {chatContent}
      </div>
    </>
  );
}
