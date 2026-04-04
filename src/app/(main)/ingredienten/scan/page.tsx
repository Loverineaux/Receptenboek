'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
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
    kcal: '',
    protein: '',
    fat: '',
    saturated_fat: '',
    carbs: '',
    sugars: '',
    fiber: '',
    salt: '',
  });

  // Label photo
  const [isUploadingLabel, setIsUploadingLabel] = useState(false);

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
          <ProductCard product={scanResult.product} />

          {/* Already linked */}
          {scanResult.product.generic_ingredient_id && scanResult.generic_ingredient && (
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
          )}

          {/* Suggested ingredient */}
          {!scanResult.product.generic_ingredient_id && scanResult.suggested_ingredient && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm text-amber-800">
                Suggestie:{' '}
                <span className="font-semibold">{scanResult.suggested_ingredient.name}</span>
              </p>
              <button
                onClick={() => handleLink(scanResult.suggested_ingredient!.id)}
                disabled={isLinking}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isLinking ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Bevestigen
              </button>
            </div>
          )}

          {/* No link, no suggestion -- search/select */}
          {!scanResult.product.generic_ingredient_id && !scanResult.suggested_ingredient && (
            <div className="rounded-xl border border-gray-200 bg-surface p-4">
              <p className="mb-3 text-sm font-medium text-text-primary">
                Koppel aan een ingredi&euml;nt
              </p>

              {!showNewForm ? (
                <>
                  {/* Search input */}
                  <div className="relative mb-2">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type="text"
                      value={ingredientSearch}
                      onChange={(e) => searchIngredients(e.target.value)}
                      placeholder="Zoek ingredi&euml;nt..."
                      className="w-full rounded-lg border border-gray-200 bg-background py-2 pl-9 pr-3 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Search results */}
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
                              <span className="ml-2 text-xs text-text-muted">
                                {ing.category}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {ingredientSearch.length >= 2 &&
                    !isSearching &&
                    searchResults.length === 0 && (
                      <p className="mb-3 py-2 text-center text-xs text-text-muted">
                        Geen resultaten gevonden
                      </p>
                    )}

                  <div className="flex items-center gap-2">
                    {selectedIngredient && (
                      <button
                        onClick={() => handleLink(selectedIngredient.id)}
                        disabled={isLinking}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isLinking ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Koppelen
                      </button>
                    )}

                    <button
                      onClick={() => setShowNewForm(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
                    >
                      <Plus size={14} />
                      Nieuw ingredi&euml;nt aanmaken
                    </button>
                  </div>
                </>
              ) : (
                /* Inline new ingredient form */
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-muted">
                      Naam
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Bijv. Kikkererwten"
                      className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-muted">
                      Categorie
                    </label>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Bijv. Peulvruchten"
                      className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCreateIngredient}
                      disabled={!newName.trim() || isLinking}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isLinking ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      Aanmaken en koppelen
                    </button>
                    <button
                      onClick={() => {
                        setShowNewForm(false);
                        setNewName('');
                        setNewCategory('');
                      }}
                      className="rounded-lg px-3 py-2 text-sm text-text-muted hover:text-text-primary"
                    >
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

          {/* Scan again (if already linked) */}
          {scanResult.product.generic_ingredient_id && (
            <button
              onClick={resetScanner}
              className="w-full rounded-lg border border-gray-200 bg-surface py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
            >
              Nog een product scannen?
            </button>
          )}
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
