'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, Plus, Search, Camera, Loader2 } from 'lucide-react';
import BarcodeScanner from '@/components/ingredients/BarcodeScanner';
import ProductCard from '@/components/ingredients/ProductCard';
import type { Product, GenericIngredient } from '@/types';

type Step =
  | 'scanning'
  | 'loading'
  | 'found'
  | 'not_found'
  | 'manual_entry'
  | 'linking'
  | 'done';

interface ScanResult {
  product: Product;
  generic_ingredient?: GenericIngredient | null;
  suggested_ingredient?: GenericIngredient | null;
}

export default function ScanPage() {
  const [step, setStep] = useState<Step>('scanning');
  const [barcode, setBarcode] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Linking state
  const [selectedIngredient, setSelectedIngredient] = useState<GenericIngredient | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<GenericIngredient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // New ingredient inline form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Manual product entry
  const [manualForm, setManualForm] = useState({
    product_name: '',
    brand: '',
    barcode: '',
    image_url: '',
    kcal: '',
    protein: '',
    fat: '',
    saturated_fat: '',
    carbs: '',
    sugars: '',
    fiber: '',
    salt: '',
  });
  const [manualImagePreview, setManualImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Label photo & manual nutrition
  const [isUploadingLabel, setIsUploadingLabel] = useState(false);
  const [showNutritionForm, setShowNutritionForm] = useState(false);
  const [nutritionForm, setNutritionForm] = useState({
    kcal: '', protein: '', fat: '', saturated_fat: '',
    carbs: '', sugars: '', fiber: '', salt: '',
  });

  const scanningRef = useRef(false);

  const handleScan = useCallback(async (scannedBarcode: string) => {
    if (scanningRef.current) return;
    scanningRef.current = true;

    setBarcode(scannedBarcode);
    setStep('loading');
    setError(null);

    try {
      const res = await fetch('/api/products/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: scannedBarcode }),
      });

      if (!res.ok) {
        throw new Error('Onverwachte fout bij het opzoeken van het product.');
      }

      const data = await res.json();

      if (!data.product || data.source === 'not_found') {
        setManualForm((prev) => ({ ...prev, barcode: scannedBarcode }));
        setStep('not_found');
      } else {
        setScanResult({
          product: data.product,
          generic_ingredient: data.linked_ingredient || null,
          suggested_ingredient: data.suggested_ingredient || null,
        });
        // Pre-fill new ingredient form with AI suggestions from product data
        if (!data.linked_ingredient && !data.suggested_ingredient) {
          if (data.suggested_name) setNewName(data.suggested_name);
          if (data.suggested_category) setNewCategory(data.suggested_category);
          setShowNewForm(true);
        }
        setStep('found');
      }
    } catch (err: any) {
      setError(err.message || 'Er ging iets mis.');
      setStep('not_found');
      setManualForm((prev) => ({ ...prev, barcode: scannedBarcode }));
    } finally {
      scanningRef.current = false;
    }
  }, []);

  const searchIngredients = async (query: string) => {
    setIngredientSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/ingredients?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.ingredients ?? data);
      }
    } catch {
      // silent
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async (ingredientId: string) => {
    if (!scanResult?.product) return;
    setIsLinking(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${scanResult.product.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generic_ingredient_id: ingredientId }),
      });

      if (!res.ok) throw new Error('Koppeling mislukt.');
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLinking(false);
    }
  };

  const handleCreateIngredient = async () => {
    if (!newName.trim()) return;
    setIsLinking(true);
    setError(null);

    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory.trim() || null,
        }),
      });

      if (!res.ok) throw new Error('Aanmaken mislukt.');
      const created: GenericIngredient = await res.json();
      setSelectedIngredient(created);
      setShowNewForm(false);

      // Automatically link
      await handleLink(created.id);
    } catch (err: any) {
      setError(err.message);
      setIsLinking(false);
    }
  };

  const handleLabelPhoto = async (file: File) => {
    setIsUploadingLabel(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('barcode', barcode);

      const res = await fetch('/api/products/scan-label', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Label kon niet verwerkt worden.');
      const data: ScanResult = await res.json();
      setScanResult(data);
      setStep('found');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploadingLabel(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualForm.product_name.trim()) return;
    setStep('loading');
    setError(null);

    try {
      const payload = {
        product_name: manualForm.product_name.trim(),
        brand: manualForm.brand.trim() || null,
        barcode: manualForm.barcode.trim(),
        image_url: manualForm.image_url || null,
        kcal: manualForm.kcal ? parseFloat(manualForm.kcal) : null,
        protein: manualForm.protein ? parseFloat(manualForm.protein) : null,
        fat: manualForm.fat ? parseFloat(manualForm.fat) : null,
        saturated_fat: manualForm.saturated_fat ? parseFloat(manualForm.saturated_fat) : null,
        carbs: manualForm.carbs ? parseFloat(manualForm.carbs) : null,
        sugars: manualForm.sugars ? parseFloat(manualForm.sugars) : null,
        fiber: manualForm.fiber ? parseFloat(manualForm.fiber) : null,
        salt: manualForm.salt ? parseFloat(manualForm.salt) : null,
        source: 'user_scan',
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Product aanmaken mislukt.');
      const product: Product = await res.json();
      setScanResult({ product });
      setStep('found');
    } catch (err: any) {
      setError(err.message);
      setStep('not_found');
    }
  };

  const resetScanner = () => {
    scanningRef.current = false;
    setStep('scanning');
    setBarcode('');
    setScanResult(null);
    setSelectedIngredient(null);
    setIngredientSearch('');
    setSearchResults([]);
    setShowNewForm(false);
    setNewName('');
    setNewCategory('');
    setError(null);
    setShowNutritionForm(false);
    setNutritionForm({ kcal: '', protein: '', fat: '', saturated_fat: '', carbs: '', sugars: '', fiber: '', salt: '' });
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/ingredienten"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-text-muted transition-colors hover:bg-gray-200"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold text-text-primary">Barcode scannen</h1>
      </div>

      {/* Step: Scanning */}
      {step === 'scanning' && (
        <BarcodeScanner onScan={handleScan} onClose={() => window.history.back()} />
      )}

      {/* Step: Loading */}
      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-surface py-16">
          <Loader2 size={32} className="mb-3 animate-spin text-primary" />
          <p className="text-sm text-text-muted">Product opzoeken...</p>
          <p className="mt-1 font-mono text-xs text-text-muted/60">{barcode}</p>
        </div>
      )}

      {/* Step: Product Found */}
      {step === 'found' && scanResult?.product && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            <Check size={16} />
            Product gevonden en opgeslagen in de database
          </div>

          {/* Product hero */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
            {/* Image + basic info */}
            <div className="flex gap-4 p-4">
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                {scanResult.product.image_url ? (
                  <Image
                    src={scanResult.product.image_url}
                    alt={scanResult.product.product_name}
                    fill
                    sizes="96px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <span className="text-3xl">📦</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-text-primary">
                  {scanResult.product.product_name}
                </h2>
                {scanResult.product.brand && (
                  <p className="mt-0.5 text-sm text-text-muted">{scanResult.product.brand}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    scanResult.product.source === 'open_food_facts' ? 'bg-blue-100 text-blue-700' :
                    scanResult.product.source === 'user_photo' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {scanResult.product.source === 'open_food_facts' ? 'Open Food Facts' :
                     scanResult.product.source === 'user_photo' ? 'Foto' : 'Gescand'}
                  </span>
                  {scanResult.product.weight_grams && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                      {scanResult.product.weight_grams}g
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-text-muted">
                    {scanResult.product.barcode}
                  </span>
                </div>
              </div>
            </div>

            {/* Full nutrition table */}
            {(scanResult.product.kcal != null || scanResult.product.protein != null) && (
              <div className="border-t border-gray-100">
                <div className="px-4 py-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Voedingswaarden per 100g
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-50">
                        {([
                          ['Energie', scanResult.product.kcal, 'kcal'],
                          ['Eiwitten', scanResult.product.protein, 'g'],
                          ['Vetten', scanResult.product.fat, 'g'],
                          ['  waarvan verzadigd', scanResult.product.saturated_fat, 'g'],
                          ['Koolhydraten', scanResult.product.carbs, 'g'],
                          ['  waarvan suikers', scanResult.product.sugars, 'g'],
                          ['Vezels', scanResult.product.fiber, 'g'],
                          ['Zout', scanResult.product.salt, 'g'],
                        ] as const).map(([label, value, unit], idx) =>
                          value != null ? (
                            <tr key={idx} className={String(label).startsWith('  ') ? 'bg-gray-50/50' : ''}>
                              <td className="px-3 py-1.5 text-text-primary">
                                {String(label).startsWith('  ') ? (
                                  <span className="pl-3 text-xs text-text-muted">{String(label).trim()}</span>
                                ) : label}
                              </td>
                              <td className="px-3 py-1.5 text-right font-medium text-text-primary">
                                {typeof value === 'number' ? (label === 'Energie' ? Math.round(value) : Number(value).toFixed(1)) : value} {unit}
                              </td>
                            </tr>
                          ) : null
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* No nutrition data — offer to add */}
            {scanResult.product.kcal == null && scanResult.product.protein == null && (
              <div className="border-t border-gray-100 px-4 py-4">
                <p className="mb-3 text-center text-sm text-text-muted">
                  Geen voedingswaarden beschikbaar
                </p>
                <div className="flex flex-col gap-2">
                  <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90">
                    {isUploadingLabel ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Camera size={16} />
                    )}
                    Foto van voedingswaardenlabel
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingLabel(true);
                        setError(null);
                        try {
                          const reader = new FileReader();
                          const dataUrl = await new Promise<string>((resolve) => {
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(file);
                          });
                          const res = await fetch('/api/products/scan-label', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              barcode: scanResult.product.barcode,
                              image: dataUrl,
                              product_name: scanResult.product.product_name,
                            }),
                          });
                          if (!res.ok) throw new Error('Label kon niet verwerkt worden.');
                          const data = await res.json();
                          // Update the product in our scan result with new nutrition
                          setScanResult((prev) => prev ? {
                            ...prev,
                            product: { ...prev.product, ...data.product },
                          } : prev);
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setIsUploadingLabel(false);
                        }
                      }}
                    />
                  </label>
                  <button
                    onClick={() => setShowNutritionForm(true)}
                    className="w-full rounded-lg border border-gray-200 bg-surface py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
                  >
                    Handmatig invoeren
                  </button>
                </div>

                {/* Inline nutrition form */}
                {showNutritionForm && (
                  <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <p className="mb-2 text-xs font-medium text-text-muted">Voedingswaarden per 100g</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ['kcal', 'Energie (kcal)'],
                        ['protein', 'Eiwit (g)'],
                        ['fat', 'Vet (g)'],
                        ['saturated_fat', 'Verzadigd (g)'],
                        ['carbs', 'Koolhydraten (g)'],
                        ['sugars', 'Suikers (g)'],
                        ['fiber', 'Vezels (g)'],
                        ['salt', 'Zout (g)'],
                      ] as const).map(([key, label]) => (
                        <div key={key}>
                          <label className="mb-0.5 block text-[10px] text-text-muted">{label}</label>
                          <input
                            type="number"
                            step="0.1"
                            value={nutritionForm[key]}
                            onChange={(e) => setNutritionForm((f) => ({ ...f, [key]: e.target.value }))}
                            className="w-full rounded-md border border-gray-200 bg-background px-2 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={async () => {
                          setError(null);
                          try {
                            const updates: Record<string, number | null> = {};
                            for (const [k, v] of Object.entries(nutritionForm)) {
                              updates[k] = v ? parseFloat(v) : null;
                            }
                            const supabase = (await import('@/lib/supabase/client')).createClient();
                            const { error: updateError } = await supabase
                              .from('products')
                              .update(updates)
                              .eq('id', scanResult.product.id);
                            if (updateError) throw new Error(updateError.message);
                            setScanResult((prev) => prev ? {
                              ...prev,
                              product: { ...prev.product, ...updates },
                            } : prev);
                            setShowNutritionForm(false);
                          } catch (err: any) {
                            setError(err.message);
                          }
                        }}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setShowNutritionForm(false)}
                        className="rounded-lg px-3 py-2 text-sm text-text-muted hover:text-text-primary"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ingredient linking section */}
          {scanResult.product.generic_ingredient_id && scanResult.generic_ingredient ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Gekoppeld aan:{' '}
                  <Link
                    href={`/ingredienten/${scanResult.generic_ingredient.id}`}
                    className="underline hover:no-underline"
                  >
                    {scanResult.generic_ingredient.name}
                  </Link>
                </p>
              </div>
            </div>
          ) : scanResult.suggested_ingredient ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm text-amber-800">
                Suggestie:{' '}
                <span className="font-semibold">{scanResult.suggested_ingredient.name}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLink(scanResult.suggested_ingredient!.id)}
                  disabled={isLinking}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLinking ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Bevestigen
                </button>
                <button
                  onClick={() => {
                    // Clear suggestion so the manual search form shows
                    setScanResult((prev) => prev ? { ...prev, suggested_ingredient: null } : null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
                >
                  Andere kiezen
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-surface p-4">
              <p className="mb-3 text-sm font-medium text-text-primary">
                Koppel aan een ingredi&euml;nt
              </p>

              {!showNewForm ? (
                <>
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={ingredientSearch}
                      onChange={(e) => searchIngredients(e.target.value)}
                      placeholder="Zoek ingredi&euml;nt..."
                      className="w-full rounded-lg border border-gray-200 bg-background py-2 pl-9 pr-3 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {isSearching && (
                    <div className="py-2 text-center">
                      <Loader2 size={16} className="mx-auto animate-spin text-text-muted" />
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <ul className="mb-3 max-h-48 space-y-1 overflow-y-auto">
                      {searchResults.map((ing) => (
                        <li key={ing.id}>
                          <button
                            onClick={() => setSelectedIngredient(ing)}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              selectedIngredient?.id === ing.id
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-text-primary hover:bg-gray-100'
                            }`}
                          >
                            {ing.name}
                            {ing.category && (
                              <span className="ml-2 text-xs text-text-muted">{ing.category}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {ingredientSearch.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <p className="mb-3 py-2 text-center text-xs text-text-muted">Geen resultaten gevonden</p>
                  )}

                  <div className="flex items-center gap-2">
                    {selectedIngredient && (
                      <button
                        onClick={() => handleLink(selectedIngredient.id)}
                        disabled={isLinking}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isLinking ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Koppelen
                      </button>
                    )}
                    <button
                      onClick={() => setShowNewForm(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
                    >
                      <Plus size={14} />
                      Nieuw ingredi&euml;nt
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-muted">Naam</label>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Bijv. Kikkererwten"
                      className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-muted">Categorie</label>
                    <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Bijv. Peulvruchten"
                      className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCreateIngredient} disabled={!newName.trim() || isLinking}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
                      {isLinking ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Aanmaken en koppelen
                    </button>
                    <button onClick={() => { setShowNewForm(false); setNewName(''); setNewCategory(''); }}
                      className="rounded-lg px-3 py-2 text-sm text-text-muted hover:text-text-primary">
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={resetScanner}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Nog een product scannen
            </button>
            <Link
              href="/ingredienten"
              className="rounded-lg border border-gray-200 bg-surface px-4 py-2.5 text-center text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
            >
              Terug
            </Link>
          </div>
        </div>
      )}

      {/* Step: Not Found */}
      {step === 'not_found' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-surface p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Search size={20} className="text-text-muted" />
            </div>
            <p className="mb-1 text-sm font-medium text-text-primary">
              Product niet gevonden in de database
            </p>
            <p className="mb-4 text-xs text-text-muted">
              Barcode: <span className="font-mono">{barcode}</span>
            </p>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="space-y-2">
              {/* Label photo option */}
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90">
                {isUploadingLabel ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
                Foto van voedingswaardenlabel
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLabelPhoto(file);
                  }}
                />
              </label>

              {/* Manual entry option */}
              <button
                onClick={() => setStep('manual_entry')}
                className="w-full rounded-lg border border-gray-200 bg-surface py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
              >
                Handmatig invoeren
              </button>
            </div>
          </div>

          <button
            onClick={resetScanner}
            className="w-full rounded-lg border border-gray-200 bg-surface py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-gray-50"
          >
            Opnieuw scannen
          </button>
        </div>
      )}

      {/* Step: Manual Entry */}
      {step === 'manual_entry' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-surface p-4">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">
              Product handmatig invoeren
            </h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Productnaam *
                </label>
                <input
                  type="text"
                  value={manualForm.product_name}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, product_name: e.target.value }))
                  }
                  placeholder="Bijv. Halfvolle melk"
                  className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Merk
                </label>
                <input
                  type="text"
                  value={manualForm.brand}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, brand: e.target.value }))
                  }
                  placeholder="Bijv. Albert Heijn"
                  className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Barcode
                </label>
                <input
                  type="text"
                  value={manualForm.barcode}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, barcode: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 font-mono text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  readOnly
                />
              </div>

              {/* Product image */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Productfoto (optioneel)
                </label>
                <div className="flex items-center gap-3">
                  {manualImagePreview ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
                      <Image src={manualImagePreview} alt="Product" fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => { setManualImagePreview(null); setManualForm(f => ({ ...f, image_url: '' })); }}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
                      >&times;</button>
                    </div>
                  ) : (
                    <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-text-muted transition-colors hover:border-primary hover:text-primary">
                      <Camera size={20} />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setManualImagePreview(URL.createObjectURL(file));
                          // Upload to Supabase Storage
                          setUploadingImage(true);
                          try {
                            const supabase = (await import('@/lib/supabase/client')).createClient();
                            const path = `products/${Date.now()}-${file.name}`;
                            const { error: upErr } = await supabase.storage
                              .from('recipe-images')
                              .upload(path, file, { contentType: file.type, upsert: true });
                            if (!upErr) {
                              const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
                              setManualForm(f => ({ ...f, image_url: urlData.publicUrl }));
                            }
                          } catch {} finally {
                            setUploadingImage(false);
                          }
                        }}
                      />
                    </label>
                  )}
                  {uploadingImage && <Loader2 size={14} className="animate-spin text-text-muted" />}
                </div>
              </div>

              {/* Nutrition fields */}
              <div className="border-t border-gray-100 pt-3">
                <p className="mb-2 text-xs font-medium text-text-muted">
                  Voedingswaarden per 100g (optioneel)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['kcal', 'Energie (kcal)'],
                    ['protein', 'Eiwit (g)'],
                    ['fat', 'Vet (g)'],
                    ['saturated_fat', 'Verzadigd vet (g)'],
                    ['carbs', 'Koolhydraten (g)'],
                    ['sugars', 'Suikers (g)'],
                    ['fiber', 'Vezels (g)'],
                    ['salt', 'Zout (g)'],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-0.5 block text-[10px] text-text-muted">
                        {label}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={manualForm[key]}
                        onChange={(e) =>
                          setManualForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className="w-full rounded-md border border-gray-200 bg-background px-2 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleManualSubmit}
                disabled={!manualForm.product_name.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Product opslaan
              </button>
              <button
                onClick={() => setStep('not_found')}
                className="rounded-lg px-3 py-2 text-sm text-text-muted hover:text-text-primary"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check size={24} className="text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-800">
              Product succesvol gekoppeld!
            </p>
          </div>

          <button
            onClick={resetScanner}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Nog een product scannen?
          </button>

          <Link
            href="/ingredienten"
            className="block w-full rounded-lg border border-gray-200 bg-surface py-2.5 text-center text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
          >
            Terug naar ingredi&euml;nten
          </Link>
        </div>
      )}
    </div>
  );
}
