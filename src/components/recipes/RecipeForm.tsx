'use client';

import { useState, FormEvent } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type {
  Source,
  Difficulty,
  RecipeWithRelations,
  ExtractedRecipe,
} from '@/types';

// ---------- sub-types for form state ----------

interface IngredientRow {
  hoeveelheid: string;
  eenheid: string;
  naam: string;
}

interface StepRow {
  titel: string;
  beschrijving: string;
  afbeelding_url: string;
}

interface NutritionState {
  calories: string;
  protein_grams: string;
  carbs_grams: string;
  fat_grams: string;
  fiber_grams: string;
  sugar_grams: string;
  sodium_mg: string;
}

interface BenodigdheidRow {
  naam: string;
}

export interface RecipeFormData {
  title: string;
  description: string;
  image_url: string;
  total_time_minutes: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  difficulty: Difficulty;
  source: Source;
  source_url: string;
  servings: number;
  is_public: boolean;
  weetje: string;
  allergenen: string;
  ingredients: { hoeveelheid: number | null; eenheid: string | null; naam: string }[];
  steps: { titel: string | null; beschrijving: string; afbeelding_url: string | null }[];
  nutrition: NutritionState | null;
  benodigdheden: string[];
  tags: string[];
}

interface RecipeFormProps {
  initialData?: RecipeWithRelations | ExtractedRecipe | null;
  onSubmit: (data: RecipeFormData) => Promise<void>;
}

const sources: Source[] = [
  'HelloFresh',
  'Albert Heijn',
  'Jumbo',
  'Broodje Dunner',
  'Eigen recept',
];

const difficulties: Difficulty[] = ['Makkelijk', 'Gemiddeld', 'Moeilijk'];

const categories = [
  'Kip',
  'Vlees',
  'Vis',
  'Vegetarisch',
  'Veganistisch',
  'Pasta',
  'Salade',
  'Soep',
  'Bijgerecht',
  'Dessert',
];

const emptyIngredient = (): IngredientRow => ({
  hoeveelheid: '',
  eenheid: '',
  naam: '',
});

const emptyStep = (): StepRow => ({
  titel: '',
  beschrijving: '',
  afbeelding_url: '',
});

const emptyNutrition = (): NutritionState => ({
  calories: '',
  protein_grams: '',
  carbs_grams: '',
  fat_grams: '',
  fiber_grams: '',
  sugar_grams: '',
  sodium_mg: '',
});

export default function RecipeForm({ initialData, onSubmit }: RecipeFormProps) {
  // Determine if we're dealing with a full RecipeWithRelations or an ExtractedRecipe
  const isFullRecipe = initialData && 'id' in initialData;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [imageUrl, setImageUrl] = useState(
    (isFullRecipe ? (initialData as RecipeWithRelations).image_url : '') ?? ''
  );
  const [totalTime, setTotalTime] = useState(
    initialData?.total_time_minutes?.toString() ?? ''
  );
  const [prepTime, setPrepTime] = useState(
    initialData?.prep_time_minutes?.toString() ?? ''
  );
  const [cookTime, setCookTime] = useState(
    initialData?.cook_time_minutes?.toString() ?? ''
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initialData?.difficulty ?? 'Gemiddeld'
  );
  const [source, setSource] = useState<Source>(
    initialData?.source ?? 'Eigen recept'
  );
  const [sourceUrl, setSourceUrl] = useState(
    (isFullRecipe ? (initialData as RecipeWithRelations).source_url : '') ?? ''
  );
  const [servings, setServings] = useState(
    initialData?.servings?.toString() ?? '4'
  );
  const [isPublic, setIsPublic] = useState(
    isFullRecipe ? (initialData as RecipeWithRelations).is_public : false
  );
  const [weetje, setWeetje] = useState('');
  const [allergenen, setAllergenen] = useState('');

  // Dynamic rows
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => {
    if (initialData?.ingredients && initialData.ingredients.length > 0) {
      return initialData.ingredients.map((i) => ({
        hoeveelheid: i.hoeveelheid?.toString() ?? '',
        eenheid: i.eenheid ?? '',
        naam: i.naam,
      }));
    }
    return [emptyIngredient()];
  });

  const [steps, setSteps] = useState<StepRow[]>(() => {
    if (initialData?.steps && initialData.steps.length > 0) {
      return initialData.steps.map((s) => ({
        titel: s.titel ?? '',
        beschrijving: s.beschrijving,
        afbeelding_url: ('afbeelding_url' in s ? (s as any).afbeelding_url : '') ?? '',
      }));
    }
    return [emptyStep()];
  });

  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionState>(() => {
    const n = isFullRecipe
      ? (initialData as RecipeWithRelations).nutrition
      : initialData && 'nutrition' in initialData
      ? (initialData as ExtractedRecipe).nutrition
      : null;
    if (n) {
      return {
        calories: n.calories?.toString() ?? '',
        protein_grams: n.protein_grams?.toString() ?? '',
        carbs_grams: n.carbs_grams?.toString() ?? '',
        fat_grams: n.fat_grams?.toString() ?? '',
        fiber_grams: n.fiber_grams?.toString() ?? '',
        sugar_grams: n.sugar_grams?.toString() ?? '',
        sodium_mg: n.sodium_mg?.toString() ?? '',
      };
    }
    return emptyNutrition();
  });

  const [benodigdheden, setBenodigdheden] = useState<BenodigdheidRow[]>([
    { naam: '' },
  ]);

  const [tags, setTags] = useState<string[]>(() => {
    if (isFullRecipe && (initialData as RecipeWithRelations).tags) {
      return (initialData as RecipeWithRelations).tags.map((t) => t.name);
    }
    if (initialData && 'tags' in initialData && Array.isArray((initialData as ExtractedRecipe).tags)) {
      return (initialData as ExtractedRecipe).tags;
    }
    return [];
  });
  const [tagInput, setTagInput] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // ---------- ingredient helpers ----------

  const updateIngredient = (index: number, field: keyof IngredientRow, value: string) => {
    setIngredients((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- step helpers ----------

  const updateStep = (index: number, field: keyof StepRow, value: string) => {
    setSteps((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- benodigdheden helpers ----------

  const updateBenodigdheid = (index: number, value: string) => {
    setBenodigdheden((prev) => prev.map((row, i) => (i === index ? { naam: value } : row)));
  };

  const removeBenodigdheid = (index: number) => {
    setBenodigdheden((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- tag helpers ----------

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  // ---------- nutrition helper ----------

  const updateNutrition = (field: keyof NutritionState, value: string) => {
    setNutrition((prev) => ({ ...prev, [field]: value }));
  };

  const hasNutrition = Object.values(nutrition).some((v) => v !== '');

  // ---------- submit ----------

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const data: RecipeFormData = {
      title,
      description,
      image_url: imageUrl,
      total_time_minutes: totalTime ? parseInt(totalTime, 10) : null,
      prep_time_minutes: prepTime ? parseInt(prepTime, 10) : null,
      cook_time_minutes: cookTime ? parseInt(cookTime, 10) : null,
      difficulty,
      source,
      source_url: sourceUrl,
      servings: parseInt(servings, 10) || 4,
      is_public: isPublic,
      weetje,
      allergenen,
      ingredients: ingredients
        .filter((i) => i.naam.trim() !== '')
        .map((i) => ({
          hoeveelheid: i.hoeveelheid ? parseFloat(i.hoeveelheid) : null,
          eenheid: i.eenheid || null,
          naam: i.naam.trim(),
        })),
      steps: steps
        .filter((s) => s.beschrijving.trim() !== '')
        .map((s) => ({
          titel: s.titel || null,
          beschrijving: s.beschrijving.trim(),
          afbeelding_url: s.afbeelding_url || null,
        })),
      nutrition: hasNutrition ? nutrition : null,
      benodigdheden: benodigdheden
        .map((b) => b.naam.trim())
        .filter((n) => n !== ''),
      tags,
    };

    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- render ----------

  const labelClass = 'mb-1.5 block text-sm font-medium text-text-primary';
  const selectClass =
    'w-full rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Basic info ────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Basisgegevens</h2>

        <Input
          label="Titel *"
          placeholder="Bijv. Pasta Carbonara"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <label className={labelClass}>Beschrijving</label>
          <textarea
            className={selectClass}
            rows={2}
            placeholder="Korte beschrijving van het recept..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Input
          label="Afbeelding URL"
          type="url"
          placeholder="https://..."
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Voorbereidingstijd (min)"
            type="number"
            min={0}
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
          />
          <Input
            label="Bereidingstijd (min)"
            type="number"
            min={0}
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
          />
          <Input
            label="Totale tijd (min)"
            type="number"
            min={0}
            value={totalTime}
            onChange={(e) => setTotalTime(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Moeilijkheid</label>
            <select
              className={selectClass}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Categorie</label>
            <select className={selectClass} defaultValue="">
              <option value="" disabled>
                Kies een categorie
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Bron</label>
            <select
              className={selectClass}
              value={source}
              onChange={(e) => setSource(e.target.value as Source)}
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Bron URL"
          type="url"
          placeholder="https://..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Basis porties *"
            type="number"
            min={1}
            max={20}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            required
          />

          <div className="flex items-end gap-3 pb-0.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-primary">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50"
              />
              Openbaar recept
            </label>
          </div>
        </div>

        <div>
          <label className={labelClass}>Weetje</label>
          <textarea
            className={selectClass}
            rows={2}
            placeholder="Leuk feitje over dit gerecht..."
            value={weetje}
            onChange={(e) => setWeetje(e.target.value)}
          />
        </div>

        <Input
          label="Allergenen"
          placeholder="Bijv. gluten, lactose, noten"
          value={allergenen}
          onChange={(e) => setAllergenen(e.target.value)}
        />
      </section>

      {/* ── Ingredients ───────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">Ingredienten</h2>

        {ingredients.map((ing, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className="w-20 shrink-0">
              <Input
                placeholder="Aantal"
                value={ing.hoeveelheid}
                onChange={(e) => updateIngredient(idx, 'hoeveelheid', e.target.value)}
              />
            </div>
            <div className="w-24 shrink-0">
              <Input
                placeholder="Eenheid"
                value={ing.eenheid}
                onChange={(e) => updateIngredient(idx, 'eenheid', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Ingredient naam *"
                value={ing.naam}
                onChange={(e) => updateIngredient(idx, 'naam', e.target.value)}
              />
            </div>
            {ingredients.length > 1 && (
              <button
                type="button"
                onClick={() => removeIngredient(idx)}
                className="mt-2 text-text-muted hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIngredients((prev) => [...prev, emptyIngredient()])}
        >
          <Plus className="h-4 w-4" />
          Ingredient toevoegen
        </Button>
      </section>

      {/* ── Steps ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">Bereidingsstappen</h2>

        {steps.map((step, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-gray-200 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">
                Stap {idx + 1}
              </span>
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(idx)}
                  className="text-text-muted hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <Input
              placeholder="Staptitel (optioneel)"
              value={step.titel}
              onChange={(e) => updateStep(idx, 'titel', e.target.value)}
            />
            <textarea
              className={selectClass}
              rows={3}
              placeholder="Beschrijving van deze stap *"
              value={step.beschrijving}
              onChange={(e) => updateStep(idx, 'beschrijving', e.target.value)}
            />
            <Input
              placeholder="Afbeelding URL (optioneel)"
              value={step.afbeelding_url}
              onChange={(e) => updateStep(idx, 'afbeelding_url', e.target.value)}
            />
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSteps((prev) => [...prev, emptyStep()])}
        >
          <Plus className="h-4 w-4" />
          Stap toevoegen
        </Button>
      </section>

      {/* ── Nutrition (collapsible) ───────────────────── */}
      <section>
        <button
          type="button"
          onClick={() => setNutritionOpen((v) => !v)}
          className="flex w-full items-center justify-between text-lg font-semibold text-text-primary"
        >
          Voedingswaarden
          {nutritionOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>

        {nutritionOpen && (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input
              label="Calorieen (kcal)"
              type="number"
              value={nutrition.calories}
              onChange={(e) => updateNutrition('calories', e.target.value)}
            />
            <Input
              label="Eiwitten (g)"
              type="number"
              value={nutrition.protein_grams}
              onChange={(e) => updateNutrition('protein_grams', e.target.value)}
            />
            <Input
              label="Koolhydraten (g)"
              type="number"
              value={nutrition.carbs_grams}
              onChange={(e) => updateNutrition('carbs_grams', e.target.value)}
            />
            <Input
              label="Vet (g)"
              type="number"
              value={nutrition.fat_grams}
              onChange={(e) => updateNutrition('fat_grams', e.target.value)}
            />
            <Input
              label="Vezels (g)"
              type="number"
              value={nutrition.fiber_grams}
              onChange={(e) => updateNutrition('fiber_grams', e.target.value)}
            />
            <Input
              label="Suikers (g)"
              type="number"
              value={nutrition.sugar_grams}
              onChange={(e) => updateNutrition('sugar_grams', e.target.value)}
            />
            <Input
              label="Natrium (mg)"
              type="number"
              value={nutrition.sodium_mg}
              onChange={(e) => updateNutrition('sodium_mg', e.target.value)}
            />
          </div>
        )}
      </section>

      {/* ── Benodigdheden ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">Benodigdheden</h2>

        {benodigdheden.map((b, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Bijv. koekenpan, rasp..."
                value={b.naam}
                onChange={(e) => updateBenodigdheid(idx, e.target.value)}
              />
            </div>
            {benodigdheden.length > 1 && (
              <button
                type="button"
                onClick={() => removeBenodigdheid(idx)}
                className="text-text-muted hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setBenodigdheden((prev) => [...prev, { naam: '' }])}
        >
          <Plus className="h-4 w-4" />
          Benodigdheid toevoegen
        </Button>
      </section>

      {/* ── Tags ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">Tags</h2>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Voeg een tag toe..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
          </div>
          <Button type="button" variant="secondary" size="md" onClick={addTag}>
            Toevoegen
          </Button>
        </div>
      </section>

      {/* ── Submit ────────────────────────────────────── */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit" variant="primary" size="lg" loading={submitting}>
          {initialData && 'id' in initialData ? 'Recept bijwerken' : 'Recept opslaan'}
        </Button>
      </div>
    </form>
  );
}
