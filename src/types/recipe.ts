// ──────────────────────────────────────────────
// Enums / union types
// ──────────────────────────────────────────────

export type Source =
  | "HelloFresh"
  | "Albert Heijn"
  | "Jumbo"
  | "Broodje Dunner"
  | "Eigen recept";

export type Difficulty = "Makkelijk" | "Gemiddeld" | "Moeilijk";

// ──────────────────────────────────────────────
// Core domain models (match DB column names)
// ──────────────────────────────────────────────

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  source: Source;
  source_url: string | null;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  difficulty: Difficulty;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  recipe_id: string;
  hoeveelheid: number | null;
  eenheid: string | null;
  naam: string;
  sort_order: number;
  created_at: string;
}

export interface Step {
  id: string;
  recipe_id: string;
  titel: string | null;
  beschrijving: string;
  afbeelding_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface RecipeTag {
  recipe_id: string;
  tag_id: string;
}

export interface Nutrition {
  id: string;
  recipe_id: string;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  fiber_grams: number | null;
  sugar_grams: number | null;
  sodium_mg: number | null;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  recipe_id: string;
  user_id: string;
  score: number; // 1-5
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  recipe_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  recipe_id: string;
  user_id: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Composite / joined types
// ──────────────────────────────────────────────

export interface RecipeWithRelations extends Recipe {
  ingredients: Ingredient[];
  steps: Step[];
  tags: Tag[];
  nutrition: Nutrition | null;
  ratings: Rating[];
  comments: Comment[];
  user: UserProfile | null;
  average_rating: number | null;
  is_favorited?: boolean;
}

// ──────────────────────────────────────────────
// AI extraction
// ──────────────────────────────────────────────

export interface ExtractedIngredient {
  hoeveelheid: number | null;
  eenheid: string | null;
  naam: string;
}

export interface ExtractedStep {
  titel: string | null;
  beschrijving: string;
}

export interface ExtractedRecipe {
  title: string;
  description: string | null;
  source: Source | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  difficulty: Difficulty | null;
  ingredients: ExtractedIngredient[];
  steps: ExtractedStep[];
  tags: string[];
  nutrition: Omit<Nutrition, "id" | "recipe_id" | "created_at" | "updated_at"> | null;
}
