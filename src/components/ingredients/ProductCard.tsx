'use client';

import Image from 'next/image';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

const SOURCE_STYLES: Record<Product['source'], { label: string; className: string }> = {
  open_food_facts: {
    label: 'Open Food Facts',
    className: 'bg-blue-100 text-blue-700',
  },
  user_scan: {
    label: 'Gescand',
    className: 'bg-green-100 text-green-700',
  },
  user_photo: {
    label: 'Foto',
    className: 'bg-purple-100 text-purple-700',
  },
};

export default function ProductCard({ product }: ProductCardProps) {
  const source = SOURCE_STYLES[product.source] ?? SOURCE_STYLES.user_scan;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm">
      {/* Header with image and info */}
      <div className="flex items-start gap-3 p-3">
        {/* Product image */}
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.product_name}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-2xl">📦</span>
            </div>
          )}
        </div>

        {/* Name, brand, source */}
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-1 text-sm font-semibold text-text-primary">
            {product.product_name}
          </h4>
          {product.brand && (
            <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">
              {product.brand}
            </p>
          )}
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${source.className}`}
          >
            {source.label}
          </span>
        </div>
      </div>

      {/* Nutrition table */}
      {(product.kcal != null ||
        product.protein != null ||
        product.fat != null ||
        product.carbs != null) && (
        <div className="border-t border-gray-100 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
            Per 100g
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {product.kcal != null && (
              <>
                <span className="text-text-muted">Energie</span>
                <span className="text-right font-medium text-text-primary">
                  {Math.round(product.kcal)} kcal
                </span>
              </>
            )}
            {product.protein != null && (
              <>
                <span className="text-text-muted">Eiwit</span>
                <span className="text-right font-medium text-text-primary">
                  {product.protein.toFixed(1)}g
                </span>
              </>
            )}
            {product.fat != null && (
              <>
                <span className="text-text-muted">Vet</span>
                <span className="text-right font-medium text-text-primary">
                  {product.fat.toFixed(1)}g
                </span>
              </>
            )}
            {product.carbs != null && (
              <>
                <span className="text-text-muted">Koolhydraten</span>
                <span className="text-right font-medium text-text-primary">
                  {product.carbs.toFixed(1)}g
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
