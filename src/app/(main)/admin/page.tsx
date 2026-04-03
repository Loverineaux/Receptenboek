'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

interface LogEntry {
  time: string;
  title: string;
  cats?: string[];
  error?: string;
  reason?: string;
  type: string;
}

export default function AdminPage() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState('');
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);

  const run = async (mode: 'missing' | 'all') => {
    setRunning(true);
    setLogs([]);
    setProgress('Starten...');
    setProcessed(0);
    setTotal(0);

    try {
      const res = await fetch(`/api/recipes/recategorize?mode=${mode}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
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
            const event = JSON.parse(line.slice(6));
            const time = new Date().toLocaleTimeString();

            if (event.type === 'status') {
              setProgress(event.message);
              setTotal(event.total);
            } else if (event.type === 'done_recipe') {
              setProcessed(event.processed);
              setLogs(prev => [...prev, { time, title: event.title, cats: event.cats, type: 'success' }]);
              setProgress(`${event.processed}/${event.total}`);
            } else if (event.type === 'skip') {
              setProcessed(event.processed);
              setLogs(prev => [...prev, { time, title: event.title, reason: event.reason, type: 'skip' }]);
            } else if (event.type === 'error_recipe') {
              setProcessed(event.processed);
              setLogs(prev => [...prev, { time, title: event.title, error: event.error, type: 'error' }]);
            } else if (event.type === 'complete') {
              setProgress(`Klaar! ${event.updated}/${event.total} recepten bijgewerkt`);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setProgress(`Fout: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Admin — Re-categorize</h1>
      <p className="text-sm text-text-secondary">
        Heranalyseer recepten met AI om ontbrekende of incorrecte tags toe te wijzen.
      </p>

      <div className="flex gap-3">
        <Button
          variant="primary"
          onClick={() => run('missing')}
          disabled={running}
          loading={running}
        >
          <RefreshCw className="h-4 w-4" />
          Alleen recepten zonder tags
        </Button>
        <Button
          variant="ghost"
          onClick={() => run('all')}
          disabled={running}
        >
          Alle recepten opnieuw
        </Button>
      </div>

      {/* Progress */}
      {(running || logs.length > 0) && (
        <div className="rounded-xl border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            {running && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            <span className="text-sm font-medium text-text-primary">{progress}</span>
          </div>

          {total > 0 && (
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${total > 0 ? (processed / total) * 100 : 0}%` }}
              />
            </div>
          )}

          <div className="max-h-96 space-y-1.5 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {log.type === 'success' ? (
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-white">✓</span>
                ) : log.type === 'error' ? (
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">!</span>
                ) : (
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] text-gray-500">—</span>
                )}
                <div>
                  <span className="font-medium text-text-primary">{log.title}</span>
                  {log.cats && (
                    <span className="ml-2 text-text-muted">→ {log.cats.join(', ')}</span>
                  )}
                  {log.reason && (
                    <span className="ml-2 text-amber-600">{log.reason}</span>
                  )}
                  {log.error && (
                    <span className="ml-2 text-red-500">{log.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
