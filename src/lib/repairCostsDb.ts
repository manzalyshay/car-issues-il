import { getServiceClient } from '@/lib/adminAuth';

const CATEGORY_TIER: Record<string, string> = {
  suv: 'suv', crossover: 'suv', pickup: 'suv',
  sedan: 'family', hatchback: 'family', wagon: 'family', minivan: 'family',
  sports: 'family', electric: 'family', luxury: 'luxury',
};

export interface RepairCost {
  repair_key: string;
  repair_name_he: string;
  min_ils: number;
  max_ils: number;
  category: string;
  applies_to: string;
  source_url?: string;
  notes_he?: string;
}

export async function getRepairCosts(category: string): Promise<RepairCost[]> {
  const tier = CATEGORY_TIER[category] ?? 'family';
  const db = getServiceClient();
  const { data } = await db
    .from('repair_costs')
    .select('repair_key, repair_name_he, min_ils, max_ils, category, applies_to, source_url, notes_he')
    .in('applies_to', ['all', tier])
    .order('category')
    .order('repair_key');
  return data ?? [];
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
  const db = getServiceClient();
  const { data } = await db
    .from('user_repair_costs')
    .select('repair_key, repair_name_he, cost_ils, workshop_type, notes, year')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .order('repair_key');
  return data ?? [];
}
