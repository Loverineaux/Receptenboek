export interface GenericIngredient {
  id: string;
  name: string;
  name_plural: string | null;
  category: string | null;
  aliases: string[];
  avg_kcal: number | null;
  avg_protein: number | null;
  avg_fat: number | null;
  avg_saturated_fat: number | null;
  avg_carbs: number | null;
  avg_sugars: number | null;
  avg_fiber: number | null;
  avg_salt: number | null;
  product_count: number;
  gram_per_piece: number | null;
  gram_per_ml: number | null;
  gram_per_el: number | null;
  gram_per_tl: number | null;
  description: string | null;
  origin: string | null;
  usage_tips: string | null;
  storage_tips: string | null;
  season: string | null;
  variants: string[];
  fun_facts: string | null;
  image_url: string | null;
  content_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  barcode: string;
  generic_ingredient_id: string | null;
  brand: string | null;
  product_name: string;
  weight_grams: number | null;
  weight_ml: number | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  saturated_fat: number | null;
  carbs: number | null;
  sugars: number | null;
  fiber: number | null;
  salt: number | null;
  image_url: string | null;
  nutrition_image_url: string | null;
  source: 'open_food_facts' | 'user_scan' | 'user_photo';
  scanned_by: string | null;
  verification_count: number;
  created_at: string;
  updated_at: string;
}

export interface UnitConversion {
  id: string;
  unit_name: string;
  unit_aliases: string[];
  ml_equivalent: number | null;
  gram_default: number | null;
  notes: string | null;
}

export interface NutritionCalculation {
  total_kcal: number;
  total_protein: number;
  total_fat: number;
  total_saturated_fat: number;
  total_carbs: number;
  total_sugars: number;
  total_fiber: number;
  total_salt: number;
  per_portion_kcal: number;
  per_portion_protein: number;
  per_portion_fat: number;
  per_portion_saturated_fat: number;
  per_portion_carbs: number;
  per_portion_sugars: number;
  per_portion_fiber: number;
  per_portion_salt: number;
  coverage: number;
  matched_count: number;
  total_count: number;
  matched: string[];
  missing: string[];
}

export interface GenericIngredientWithProducts extends GenericIngredient {
  products: Product[];
  recipe_count: number;
}
