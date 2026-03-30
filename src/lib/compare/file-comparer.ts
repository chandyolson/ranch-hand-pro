import { supabase } from '@/integrations/supabase/client';

export type MatchBy = 'eid' | 'tag' | 'tag_color';
export type CompareTarget = 'group' | 'project';
export type CompareStatus = 'matched' | 'missing' | 'extra';

export interface CompareAnimal {
  id?: string;
  tag: string;
  tag_color?: string | null;
  eid?: string | null;
  breed?: string | null;
  year_born?: number | null;
  sex?: string | null;
  status: CompareStatus;
  fileRow?: Record<string, string | number | null>;
}

function makeKey(animal: { tag?: string; tag_color?: string | null; eid?: string | null }, matchBy: MatchBy): string {
  if (matchBy === 'eid') return (animal.eid ?? '').trim().toLowerCase();
  if (matchBy === 'tag_color') return `${(animal.tag ?? '').trim().toLowerCase()}||${(animal.tag_color ?? '').trim().toLowerCase()}`;
  return (animal.tag ?? '').trim().toLowerCase();
}

function fileRowKey(row: Record<string, string | number | null>, matchBy: MatchBy, headers: string[]): string {
  if (matchBy === 'eid') {
    const col = headers.find(h => /^eid$/i.test(h.trim())) ?? headers.find(h => /eid/i.test(h));
    return col ? String(row[col] ?? '').trim().toLowerCase() : '';
  }
  if (matchBy === 'tag_color') {
    const tagCol = headers.find(h => /^tag$/i.test(h.trim())) ?? headers.find(h => /tag/i.test(h));
    const colorCol = headers.find(h => /color/i.test(h));
    return `${String(row[tagCol ?? ''] ?? '').trim().toLowerCase()}||${String(row[colorCol ?? ''] ?? '').trim().toLowerCase()}`;
  }
  const tagCol = headers.find(h => /^tag$/i.test(h.trim())) ?? headers.find(h => /tag/i.test(h));
  return String(row[tagCol ?? ''] ?? '').trim().toLowerCase();
}

export async function fetchTargetAnimals(
  operationId: string,
  target: CompareTarget,
  targetId: string,
): Promise<Array<{ id: string; tag: string; tag_color: string | null; eid: string | null; breed: string | null; year_born: number | null; sex: string }>> {
  if (target === 'group') {
    const { data, error } = await (supabase.from('animal_groups' as any)
      .select('animal_id, animals!animal_groups_animal_id_fkey(id, tag, tag_color, eid, breed, year_born, sex)')
      .eq('group_id', targetId)
      .is('end_date', null));
    if (error) throw error;
    return (data ?? []).map((r: any) => r.animals).filter(Boolean);
  }
  // project
  const { data, error } = await (supabase.from('cow_work' as any)
    .select('animal_id, animals!cow_work_animal_id_fkey(id, tag, tag_color, eid, breed, year_born, sex)')
    .eq('project_id', targetId));
  if (error) throw error;
  const seen = new Set<string>();
  return (data ?? []).map((r: any) => r.animals).filter((a: any) => {
    if (!a || seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export function compareFile(
  fileRows: Record<string, string | number | null>[],
  headers: string[],
  targetAnimals: Array<{ id: string; tag: string; tag_color: string | null; eid: string | null; breed: string | null; year_born: number | null; sex: string }>,
  matchBy: MatchBy,
): CompareAnimal[] {
  const targetMap = new Map<string, typeof targetAnimals[0]>();
  for (const a of targetAnimals) {
    const k = makeKey(a, matchBy);
    if (k) targetMap.set(k, a);
  }

  const matchedKeys = new Set<string>();
  const results: CompareAnimal[] = [];

  for (const row of fileRows) {
    const k = fileRowKey(row, matchBy, headers);
    if (!k) continue;
    const match = targetMap.get(k);
    if (match) {
      matchedKeys.add(k);
      results.push({ ...match, status: 'matched', fileRow: row });
    } else {
      // Extra — in file but not in target
      const tagCol = headers.find(h => /^tag$/i.test(h.trim())) ?? headers.find(h => /tag/i.test(h));
      const eidCol = headers.find(h => /eid/i.test(h));
      results.push({
        tag: String(row[tagCol ?? ''] ?? ''),
        eid: eidCol ? String(row[eidCol] ?? '') : null,
        status: 'extra',
        fileRow: row,
      });
    }
  }

  // Missing — in target but not in file
  for (const a of targetAnimals) {
    const k = makeKey(a, matchBy);
    if (!matchedKeys.has(k)) {
      results.push({ ...a, status: 'missing' });
    }
  }

  return results;
}

export function detectMatchBy(headers: string[]): MatchBy {
  if (headers.some(h => /^eid$/i.test(h.trim()))) return 'eid';
  return 'tag';
}

export function exportComparisonCsv(results: CompareAnimal[]): string {
  const lines = ['Tag,Tag Color,EID,Breed,Year Born,Sex,Status'];
  for (const r of results) {
    lines.push([r.tag, r.tag_color ?? '', r.eid ?? '', r.breed ?? '', r.year_born ?? '', r.sex ?? '', r.status.toUpperCase()].join(','));
  }
  return lines.join('\n');
}
