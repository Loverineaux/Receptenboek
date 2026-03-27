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
  energie_kcal: string;
  energie_kj: string;
  vetten: string;
  verzadigd: string;
  koolhydraten: string;
  suikers: string;
  vezels: string;
  eiwitten: string;
  zout: string;
}

interface BenodigdheidRow {
  naam: string;
}

export interface RecipeFormData {
  title: string;
  subtitle: string;
  image_url: string;
  tijd: string;
  moeilijkheid: Difficulty;
  bron: Source;
  basis_porties: number;
  is_public: boolean;
  weetje: string;
  allergenen: string;
  ingredients: { hoeveelheid: string | null; eenheid: string | null; naam: string }[];
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
  energie_kcal: '',
  energie_kj: '',
  vetten: '',
  verzadigd: '',
  koolhydraten: '',
  suikers: '',
  vezels: '',
  eiwitten: '',
  zout: '',
});

export default function RecipeForm({ initialData, onSubmit }: RecipeFormProps) {
  // Determine if we're dealing with a full RecipeWithRelations or an ExtractedRecipe
  const isFullRecipe = initialData && 'id' in initialData;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle ?? '');
  const [imageUrl, setImageUrl] = useState(
    (isFullRecipe ? (initialData as RecipeWithRelations).image_url : '') ?? ''
  );
  const [tijd, setTijd] = useState(
    initialData?.tijd ?? ''
  );
  const [moeilijkheid, setMoeilijkheid] = useState<Difficulty>(
    initialData?.moeilijkheid ?? 'Gemiddeld'
  );
  const [bron, setBron] = useState<Source>(
    initialData?.bron ?? 'Eigen recept'
  );
  const [basisPorties, setBasisPorties] = useState(
    initialData?.basis_porties?.toString() ?? '2'
  );
  const [isPublic, setIsPublic] = useState(
    isFullRecipe ? (initialData as RecipeWithRelations).is_public : false
  );
  const [weetje, setWeetje] = useState(
    (isFullRecipe ? (initialData as RecipeWithRelations).weetje : '') ?? ''
  );
  const [allergenen, setAllergenen] = useState(
    (isFullRecipe ? (initialData as RecipeWithRelations).allergenen : '') ?? ''
  );

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
        energie_kcal: n.energie_kcal?.toString() ?? '',
        energie_kj: n.energie_kj?.toString() ?? '',
        vetten: n.vetten?.toString() ?? '',
        verzadigd: n.verzadigd?.toString() ?? '',
        koolhydraten: n.koolhydraten?.toString() ?? '',
        suikers: n.suikers?.toString() ?? '',
        vezels: n.vezels?.toString() ?? '',
        eiwitten: n.eiwitten?.toString() ?? '',
        zout: n.zout?.toString() ?? '',
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
      subtitle,
      image_url: imageUrl,
      tijd,
      moeilijkheid,
      bron,
      basis_porties: parseInt(basisPorties, 10) || 2,
      is_public: isPublic,
      weetje,
      allergenen,
      ingredients: ingredients
        .filter((i) => i.naam.trim() !== '')
        .map((i) => ({
          hoeveelheid: i.hoeveelheid || null,
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
      console.log('[RecipeForm] Calling onSubmit...');
      await onSubmit(data);
      console.log('[RecipeForm] onSubmit resolved');
    } catch (err: any) {
      console.error('[RecipeForm] onSubmit error:', err.message);
    } finally {
      console.log('[RecipeForm] setSubmitting(false)');
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
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>

        <Input
          label="Afbeelding URL"
          type="url"
          placeholder="https://..."
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <Input
          label="Tijd (bijv. 25 min)"
          placeholder="Bijv. 25 min"
          value={tijd}
          onChange={(e) => setTijd(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Moeilijkheid</label>
            <select
              className={selectClass}
              value={moeilijkheid}
              onChange={(e) => setMoeilijkheid(e.target.value as Difficulty)}
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
              value={bron}
              onChange={(e) => setBron(e.target.value as Source)}
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Basis porties *"
            type="number"
            min={1}
            max={20}
            value={basisPorties}
            onChange={(e) => setBasisPorties(e.target.value)}
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
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Input
              label="Energie (kcal)"
              value={nutrition.energie_kcal}
              onChange={(e) => updateNutrition('energie_kcal', e.target.value)}
            />
            <Input
              label="Energie (kJ)"
              value={nutrition.energie_kj}
              onChange={(e) => updateNutrition('energie_kj', e.target.value)}
            />
            <Input
              label="Vetten"
              value={nutrition.vetten}
              onChange={(e) => updateNutrition('vetten', e.target.value)}
            />
            <Input
              label="Verzadigd"
              value={nutrition.verzadigd}
              onChange={(e) => updateNutrition('verzadigd', e.target.value)}
            />
            <Input
              label="Koolhydraten"
              value={nutrition.koolhydraten}
              onChange={(e) => updateNutrition('koolhydraten', e.target.value)}
            />
            <Input
              label="Suikers"
              value={nutrition.suikers}
              onChange={(e) => updateNutrition('suikers', e.target.value)}
            />
            <Input
              label="Vezels"
              value={nutrition.vezels}
              onChange={(e) => updateNutrition('vezels', e.target.value)}
            />
            <Input
              label="Eiwitten"
              value={nutrition.eiwitten}
              onChange={(e) => updateNutrition('eiwitten', e.target.value)}
            />
            <Input
              label="Zout"
              value={nutrition.zout}
              onChange={(e) => updateNutrition('zout', e.target.value)}
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
