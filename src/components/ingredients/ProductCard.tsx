'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Pencil, X, Check, Loader2, Camera } from 'lucide-react';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onUpdated?: (product: Product) => void;
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70">
        <X className="h-5 w-5" />
      </button>
      <div className="relative max-h-[85vh] max-w-[90vw]" onClick={e => e.stopPropagation()}>
        <img src={src} alt={alt} className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain" />
      </div>
    </div>
  );
}

const SOURCE_STYLES: Record<Product['source'], { label: string; className: string }> = {
  open_food_facts: { label: 'Open Food Facts', className: 'bg-blue-100 text-blue-700' },
  user_scan: { label: 'Gescand', className: 'bg-green-100 text-green-700' },
  user_photo: { label: 'Foto', className: 'bg-purple-100 text-purple-700' },
};

export default function ProductCard({ product: initialProduct, onUpdated }: ProductCardProps) {
  const [product, setProduct] = useState(initialProduct);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [form, setForm] = useState({
    product_name: '', brand: '', image_url: '', kcal: '', protein: '', fat: '',
    saturated_fat: '', carbs: '', sugars: '', fiber: '', salt: '',
  });
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const source = SOURCE_STYLES[product.source] ?? SOURCE_STYLES.user_scan;

  const startEdit = () => {
    setForm({
      product_name: product.product_name,
      brand: product.brand || '',
      image_url: product.image_url || '',
      kcal: product.kcal?.toString() || '',
      protein: product.protein?.toString() || '',
      fat: product.fat?.toString() || '',
      saturated_fat: product.saturated_fat?.toString() || '',
      carbs: product.carbs?.toString() || '',
      sugars: product.sugars?.toString() || '',
      fiber: product.fiber?.toString() || '',
      salt: product.salt?.toString() || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const updates: Record<string, any> = {
        product_name: form.product_name.trim(),
        brand: form.brand.trim() || null,
        image_url: form.image_url || null,
        kcal: form.kcal ? parseFloat(form.kcal) : null,
        protein: form.protein ? parseFloat(form.protein) : null,
        fat: form.fat ? parseFloat(form.fat) : null,
        saturated_fat: form.saturated_fat ? parseFloat(form.saturated_fat) : null,
        carbs: form.carbs ? parseFloat(form.carbs) : null,
        sugars: form.sugars ? parseFloat(form.sugars) : null,
        fiber: form.fiber ? parseFloat(form.fiber) : null,
        salt: form.salt ? parseFloat(form.salt) : null,
      };
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', product.id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as Product;
      setProduct(updated);
      onUpdated?.(updated);
      setEditing(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-primary">Product bewerken</h4>
          <button onClick={() => setEditing(false)} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-0.5 block text-[10px] font-medium text-text-muted">Productnaam</label>
              <input type="text" value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                className="w-full rounded-md border border-gray-200 bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] font-medium text-text-muted">Merk</label>
              <input type="text" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="w-full rounded-md border border-gray-200 bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium text-text-muted">Productfoto</label>
            <div className="flex items-center gap-2">
              {(imgPreview || form.image_url) ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-lg border">
                  <Image src={imgPreview || form.image_url} alt="Product" fill className="object-cover" unoptimized />
                  <button type="button" onClick={() => { setImgPreview(null); setForm(f => ({ ...f, image_url: '' })); }}
                    className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/60 text-[8px] text-white">&times;</button>
                </div>
              ) : (
                <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-text-muted hover:border-primary hover:text-primary">
                  <Camera size={16} />
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImgPreview(URL.createObjectURL(file));
                    setUploadingImg(true);
                    try {
                      const supabase = (await import('@/lib/supabase/client')).createClient();
                      const path = `products/${Date.now()}-${file.name}`;
                      const { error: upErr } = await supabase.storage.from('recipe-images').upload(path, file, { contentType: file.type, upsert: true });
                      if (!upErr) {
                        const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
                        setForm(f => ({ ...f, image_url: urlData.publicUrl }));
                      }
                    } catch {} finally { setUploadingImg(false); }
                  }} />
                </label>
              )}
              {uploadingImg && <Loader2 size={12} className="animate-spin text-text-muted" />}
            </div>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Voedingswaarden per 100g</p>
          <div className="grid grid-cols-4 gap-2">
            {([
              ['kcal', 'kcal'], ['protein', 'Eiwit'], ['fat', 'Vet'], ['saturated_fat', 'Verz.'],
              ['carbs', 'Koolh.'], ['sugars', 'Suiker'], ['fiber', 'Vezel'], ['salt', 'Zout'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="mb-0.5 block text-[9px] text-text-muted">{label}</label>
                <input type="number" step="0.1" value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 bg-background px-1.5 py-1 text-[11px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Opslaan
            </button>
            <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text-primary">
              Annuleren
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm">
      {lightboxOpen && product.image_url && (
        <ImageLightbox src={product.image_url} alt={product.product_name} onClose={() => setLightboxOpen(false)} />
      )}
      <div className="flex items-start gap-3 p-3">
        <div
          className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg ${product.image_url ? 'cursor-pointer ring-0 transition-shadow hover:ring-2 hover:ring-primary/40' : ''}`}
          onClick={() => product.image_url && setLightboxOpen(true)}
        >
          {product.image_url ? (
            <Image src={product.image_url} alt={product.product_name} fill sizes="64px" className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-2xl">📦</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-1 text-sm font-semibold text-text-primary">{product.product_name}</h4>
          {product.brand && <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">{product.brand}</p>}
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${source.className}`}>
              {source.label}
            </span>
          </div>
        </div>
        <button onClick={startEdit} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-gray-100 hover:text-text-primary" title="Bewerken">
          <Pencil size={12} />
        </button>
      </div>

      {(product.kcal != null || product.protein != null || product.fat != null || product.carbs != null) && (
        <div className="border-t border-gray-100 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">Per 100g</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {product.kcal != null && (<><span className="text-text-muted">Energie</span><span className="text-right font-medium text-text-primary">{Math.round(product.kcal)} kcal</span></>)}
            {product.protein != null && (<><span className="text-text-muted">Eiwit</span><span className="text-right font-medium text-text-primary">{product.protein.toFixed(1)}g</span></>)}
            {product.fat != null && (<><span className="text-text-muted">Vet</span><span className="text-right font-medium text-text-primary">{product.fat.toFixed(1)}g</span></>)}
            {product.carbs != null && (<><span className="text-text-muted">Koolhydraten</span><span className="text-right font-medium text-text-primary">{product.carbs.toFixed(1)}g</span></>)}
          </div>
        </div>
      )}
    </div>
  );
}
