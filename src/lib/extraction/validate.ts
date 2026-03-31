/**
 * Validate an extracted recipe and return quality issues.
 * Does NOT invent or modify data — only reports what's missing or wrong.
 */

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ValidationResult {
  score: number; // 0-100
  issues: ValidationIssue[];
}

export function validateRecipe(recipe: any): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Title
  if (!recipe.title?.trim()) {
    issues.push({ field: 'title', severity: 'error', message: 'Geen titel gevonden' });
  }

  // Image
  if (!recipe.image_url) {
    issues.push({ field: 'image_url', severity: 'warning', message: 'Geen afbeelding gevonden' });
  }

  // Ingredients
  const ings = recipe.ingredients || [];
  if (ings.length === 0) {
    issues.push({ field: 'ingredients', severity: 'error', message: 'Geen ingrediënten gevonden' });
  } else {
    const missingQty = ings.filter((i: any) => !i.hoeveelheid).length;
    if (missingQty === ings.length) {
      issues.push({ field: 'ingredients', severity: 'error', message: 'Geen enkele hoeveelheid bij ingrediënten — porties aanpassen werkt niet' });
    } else if (missingQty > 0) {
      issues.push({ field: 'ingredients', severity: 'warning', message: `${missingQty} van ${ings.length} ingrediënten missen een hoeveelheid` });
    }

    const missingUnit = ings.filter((i: any) => i.hoeveelheid && !i.eenheid).length;
    if (missingUnit > ings.length / 3) {
      issues.push({ field: 'ingredients', severity: 'info', message: `${missingUnit} ingrediënten missen een eenheid (gram, ml, stuks etc.)` });
    }
  }

  // Steps
  const steps = recipe.steps || [];
  if (steps.length === 0) {
    issues.push({ field: 'steps', severity: 'error', message: 'Geen bereidingsstappen gevonden' });
  } else if (steps.length === 1) {
    issues.push({ field: 'steps', severity: 'warning', message: 'Slechts 1 bereidingsstap — mogelijk onvolledig' });
  }

  // Portions
  if (!recipe.basis_porties) {
    issues.push({ field: 'basis_porties', severity: 'warning', message: 'Aantal porties onbekend — porties aanpassen werkt mogelijk niet correct' });
  }

  // Subtitle/intro
  if (!recipe.subtitle) {
    issues.push({ field: 'subtitle', severity: 'info', message: 'Geen introductietekst gevonden' });
  }

  // Nutrition
  if (!recipe.nutrition || Object.values(recipe.nutrition).every((v: any) => !v)) {
    issues.push({ field: 'nutrition', severity: 'info', message: 'Geen voedingswaarden gevonden' });
  }

  // Time
  if (!recipe.tijd) {
    issues.push({ field: 'tijd', severity: 'info', message: 'Geen bereidingstijd gevonden' });
  }

  // Bron
  if (!recipe.bron || recipe.bron === 'Eigen recept') {
    issues.push({ field: 'bron', severity: 'info', message: 'Geen bron gedetecteerd' });
  }

  // Calculate score
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  let score = 100;
  score -= errorCount * 25;
  score -= warningCount * 10;
  score -= infoCount * 3;
  score = Math.max(0, Math.min(100, score));

  return { score, issues };
}
