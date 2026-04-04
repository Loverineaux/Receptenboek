'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { NutritionCalculation } from '@/types';

interface NutritionBarProps {
  calculation: NutritionCalculation;
}

export default function NutritionBar({ calculation }: NutritionBarProps) {
  const [showMissing, setShowMissing] = useState(false);

  const {
    per_portion_kcal,
    per_portion_protein,
    per_portion_fat,
    per_portion_carbs,
    coverage,
    matched_count,
    total_count,
    missing,
  } = calculation;

  const coveragePercent = Math.round(coverage * 100);

  const coverageColor =
    coverage > 0.8
      ? 'text-green-600'
      : coverage > 0.5
        ? 'text-orange-500'
        : 'text-red-500';

  // Calculate macro percentages (by grams) for bar widths
  const totalMacroGrams = per_portion_protein + per_portion_fat + per_portion_carbs;
  const proteinPct = totalMacroGrams > 0 ? (per_portion_protein / totalMacroGrams) * 100 : 0;
  const fatPct = totalMacroGrams > 0 ? (per_portion_fat / totalMacroGrams) * 100 : 0;
  const carbsPct = totalMacroGrams > 0 ? (per_portion_carbs / totalMacroGrams) * 100 : 0;

  const macros = [
    {
      label: 'Eiwit',
      grams: per_portion_protein,
      percent: proteinPct,
      barColor: 'bg-blue-500',
      trackColor: 'bg-blue-100',
    },
    {
      label: 'Vet',
      grams: per_portion_fat,
      percent: fatPct,
      barColor: 'bg-yellow-500',
      trackColor: 'bg-yellow-100',
    },
    {
      label: 'Koolhydraten',
      grams: per_portion_carbs,
      percent: carbsPct,
      barColor: 'bg-green-500',
      trackColor: 'bg-green-100',
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-surface p-4">
      {/* Kcal prominent */}
      <div className="mb-3 text-center">
        <span className="text-3xl font-bold text-text-primary">
          {Math.round(per_portion_kcal)}
        </span>
        <span className="ml-1 text-sm text-text-muted">kcal / portie</span>
      </div>

      {/* Macro bars */}
      <div className="space-y-2">
        {macros.map((macro) => (
          <div key={macro.label}>
            <div className="mb-0.5 flex items-center justify-between text-xs">
              <span className="font-medium text-text-primary">{macro.label}</span>
              <span className="text-text-muted">
                {macro.grams.toFixed(1)}g ({Math.round(macro.percent)}%)
              </span>
            </div>
            <div className={`h-2 w-full overflow-hidden rounded-full ${macro.trackColor}`}>
              <div
                className={`h-full rounded-full ${macro.barColor} transition-all duration-300`}
                style={{ width: `${Math.min(macro.percent, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Coverage indicator */}
      <p className={`mt-3 text-xs ${coverageColor}`}>
        Gebaseerd op {matched_count} van {total_count} ingredi&euml;nten ({coveragePercent}%)
      </p>

      {/* Collapsible missing ingredients */}
      {missing.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowMissing((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary"
          >
            {showMissing ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Niet berekend ({missing.length})
          </button>

          {showMissing && (
            <ul className="mt-1 space-y-0.5 pl-5 text-xs text-text-muted">
              {missing.map((name) => (
                <li key={name} className="list-disc">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
