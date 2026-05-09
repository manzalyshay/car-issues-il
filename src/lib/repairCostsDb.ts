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
  notes_he?: string;
}

export async function getRepairCosts(category: string): Promise<RepairCost[]> {
  const tier = CATEGORY_TIER[category] ?? 'family';
  const db = getServiceClient();
  const { data } = await db
    .from('repair_costs')
    .select('repair_key, repair_name_he, min_ils, max_ils, category, notes_he')
    .in('applies_to', ['all', tier])
    .order('category')
    .order('repair_key');
  return data ?? [];
}
