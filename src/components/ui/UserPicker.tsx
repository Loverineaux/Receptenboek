'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, User } from 'lucide-react';
import type { UserProfile } from '@/types';

interface UserPickerProps {
  selectedUsers: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>[];
  onAdd: (user: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>) => void;
  onRemove: (userId: string) => void;
  maxUsers?: number;
  excludeIds?: string[];
}

export default function UserPicker({
  selectedUsers,
  onAdd,
  onRemove,
  maxUsers = 10,
  excludeIds = [],
}: UserPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const atMax = selectedUsers.length >= maxUsers;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const selectedIds = new Set(selectedUsers.map((u) => u.id));
          const excludeSet = new Set(excludeIds);
          setResults(data.filter((u: any) => !selectedIds.has(u.id) && !excludeSet.has(u.id)));
          setOpen(true);
        }
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
  };

  const handleSelect = (user: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>) => {
    onAdd(user);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Selected users as chips */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
              {u.display_name || 'Gebruiker'}
              <button
                type="button"
                onClick={() => onRemove(u.id)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {!atMax && (
        <div ref={containerRef} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Zoek gebruiker op naam..."
            className="w-full rounded-lg border border-gray-300 bg-surface py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          {/* Dropdown */}
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-surface shadow-lg">
              {loading ? (
                <div className="px-4 py-3 text-sm text-text-muted">Zoeken...</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-text-muted">Geen gebruikers gevonden</div>
              ) : (
                results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelect(u)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <span className="text-text-primary">{u.display_name || 'Gebruiker'}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {atMax && (
        <p className="text-xs text-text-muted">Maximum van {maxUsers} sous-chefs bereikt.</p>
      )}
    </div>
  );
}
