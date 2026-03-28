import { supabase } from '@/integrations/supabase/client';

export interface MatchResult {
  rowIndex: number;
  rowData: Record<string, string | number | null>;
  matchType: 'matched' | 'new' | 'conflict' | 'skipped';
  animalId?: string;
  animalTag?: string;
  conflicts?: { field: string; currentValue: string; importValue: string }[];
  updateFields?: Record<string, unknown>;
}

export async function matchAnimals(
  rows: Record<string, string | number | null>[],
  mapping: Record<string, string>,
  operationId: string,
): Promise<MatchResult[]> {
  const eidCol = Object.keys(mapping).find(k => mapping[k] === 'eid');
  const tagCol = Object.keys(mapping).find(k => mapping[k] === 'tag');
  const tagColorCol = Object.keys(mapping).find(k => mapping[k] === 'tag_color');

  if (!tagCol && !eidCol) {
    return rows.map((rowData, rowIndex) => ({ rowIndex, rowData, matchType: 'skipped' as const }));
  }

  // Fetch all active animals for operation
  const { data: animals } = await supabase
    .from('animals')
    .select('id, tag, tag_color, eid, breed, sex, type, year_born, birth_date, status, memo, reg_number, reg_name')
    .eq('operation_id', operationId)
    .eq('status', 'Active')
    .limit(5000) as any;

  const animalList = animals || [];
  const eidMap = new Map<string, any>();
  const tagMap = new Map<string, any[]>();

  for (const a of animalList) {
    if (a.eid) eidMap.set(a.eid.toLowerCase(), a);
    const key = `${(a.tag || '').toLowerCase()}|${(a.tag_color || '').toLowerCase()}`;
    if (!tagMap.has(key)) tagMap.set(key, []);
    tagMap.get(key)!.push(a);
    const tagOnly = (a.tag || '').toLowerCase();
    const tagOnlyKey = `${tagOnly}|`;
    if (!tagMap.has(tagOnlyKey)) tagMap.set(tagOnlyKey, []);
    tagMap.get(tagOnlyKey)!.push(a);
  }

  const fieldCols = Object.entries(mapping).filter(([, v]) => v !== '__skip__' && v !== 'tag' && v !== 'eid' && v !== 'tag_color' && v !== 'sire_tag' && v !== 'dam_tag' && v !== 'weight');
  const COMPARE_FIELDS = ['breed', 'sex', 'type', 'year_born', 'birth_date', 'status', 'memo', 'reg_number', 'reg_name'];

  const results: MatchResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const importTag = tagCol ? String(row[tagCol] ?? '').trim() : '';
    const importEid = eidCol ? String(row[eidCol] ?? '').trim() : '';

    if (!importTag && !importEid) {
      results.push({ rowIndex: i, rowData: row, matchType: 'skipped' });
      continue;
    }

    let matched: any = null;

    // Try EID first
    if (importEid) {
      matched = eidMap.get(importEid.toLowerCase()) || null;
    }

    // Try tag+color
    if (!matched && importTag) {
      const importColor = tagColorCol ? String(row[tagColorCol] ?? '').trim().toLowerCase() : '';
      const key = `${importTag.toLowerCase()}|${importColor}`;
      const candidates = tagMap.get(key);
      if (candidates && candidates.length === 1) {
        matched = candidates[0];
      } else if (!importColor) {
        // tag only
        const tagOnlyCandidates = tagMap.get(`${importTag.toLowerCase()}|`);
        if (tagOnlyCandidates && tagOnlyCandidates.length === 1) {
          matched = tagOnlyCandidates[0];
        }
      }
    }

    if (!matched) {
      results.push({ rowIndex: i, rowData: row, matchType: 'new', animalTag: importTag || importEid });
      continue;
    }

    // Check for conflicts
    const conflicts: { field: string; currentValue: string; importValue: string }[] = [];
    const updateFields: Record<string, unknown> = {};

    for (const [colName, fieldName] of fieldCols) {
      if (!COMPARE_FIELDS.includes(fieldName)) continue;
      const importVal = String(row[colName] ?? '').trim();
      if (!importVal) continue;
      const currentVal = String(matched[fieldName] ?? '').trim();
      if (!currentVal) {
        updateFields[fieldName] = fieldName === 'year_born' ? Number(importVal) : importVal;
      } else if (currentVal.toLowerCase() !== importVal.toLowerCase()) {
        conflicts.push({ field: fieldName, currentValue: currentVal, importValue: importVal });
      }
    }

    if (conflicts.length > 0) {
      results.push({ rowIndex: i, rowData: row, matchType: 'conflict', animalId: matched.id, animalTag: matched.tag, conflicts, updateFields });
    } else {
      results.push({ rowIndex: i, rowData: row, matchType: 'matched', animalId: matched.id, animalTag: matched.tag, updateFields });
    }
  }

  return results;
}
