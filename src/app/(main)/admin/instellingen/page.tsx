'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Copy, Check, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function AdminInstellingenPage() {
  const [code, setCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch('/api/admin/access-code')
      .then((r) => r.json())
      .then((data) => {
        setCode(data.code || '');
        setNewCode(data.code || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (newCode.length < 4) {
      showToast('Code moet minimaal 4 tekens zijn');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/access-code', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCode }),
    });
    if (res.ok) {
      setCode(newCode);
      showToast('Toegangscode bijgewerkt');
    } else {
      showToast('Kon code niet opslaan');
    }
    setSaving(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCode = () => {
    const words = ['Koken', 'Bakken', 'Proeven', 'Smullen', 'Kokkerellen', 'Snijden', 'Roeren', 'Flamberen'];
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const year = new Date().getFullYear();
    setNewCode(`${word1}Met${word2}${year}`);
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-gray-200" />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary">Instellingen</h1>

      {/* Access code */}
      <div className="rounded-xl border border-gray-200 bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">Toegangscode</h2>
        </div>
        <p className="mb-4 text-sm text-text-muted">
          Nieuwe gebruikers hebben deze code nodig om te registreren. Bestaande accounts worden niet beïnvloed bij wijziging.
        </p>

        {/* Current code display */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3">
          <code className="flex-1 text-sm font-mono font-medium text-text-primary">{code}</code>
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-200 hover:text-text-primary"
            title="Kopiëren"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Edit */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Nieuwe code..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={generateCode}
              className="rounded-lg border border-gray-200 p-2 text-text-muted hover:bg-gray-50 hover:text-text-primary"
              title="Willekeurige code genereren"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={newCode === code || newCode.length < 4}
            onClick={handleSave}
          >
            Opslaan
          </Button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
