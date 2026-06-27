import { dbAll } from '@/lib/db';

const CATEGORY_TIER: Record<string, string> = {
  suv: 'suv', crossover: 'suv', pickup: 'suv',
  sedan: 'family', hatchback: 'family', wagon: 'family', minivan: 'family',
  sports: 'family', electric: 'family', luxury: 'luxury',
};

export interface RepairCost {
  repair_key: string;
  repair_name_he: string;
  cost_min_ils: number;
  cost_max_ils: number;
  category: string;
  applies_to: string;
  notes?: string;
}

export async function getRepairCosts(category: string): Promise<RepairCost[]> {
  const tier = CATEGORY_TIER[category] ?? 'family';
  try {
    return await dbAll<RepairCost>(
      `SELECT repair_key, repair_name_he, cost_min_ils, cost_max_ils, category, applies_to, notes
       FROM repair_costs WHERE applies_to IN ('all', ?) ORDER BY category, repair_key`,
      tier,
    );
  } catch {
    return [];
  }
}

export interface ModelRepairCost {
  repair_key: string;
  repair_name_he: string;
  cost_ils: number;
  workshop_type: string | null;
  notes: string | null;
  year: number | null;
}

export async function getModelRepairCosts(makeSlug: string, modelSlug: string): Promise<ModelRepairCost[]> {
  try {
    return await dbAll<ModelRepairCost>(
      `SELECT repair_key, repair_name_he, cost_ils, workshop_type, notes, year
       FROM user_repair_costs WHERE make_slug = ? AND model_slug = ? ORDER BY repair_key`,
      makeSlug, modelSlug,
    );
  } catch {
    return [];
  }
}
