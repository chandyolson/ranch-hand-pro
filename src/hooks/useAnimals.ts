import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';
import { applyFiltersToQuery } from '@/lib/filter-utils';
import type { ActiveFilter } from '@/lib/filter-types';

export type AnimalSortKey = 'tag-asc' | 'tag-desc' | 'breed';

export interface UseAnimalsOptions {
  search?: string;
  filters?: ActiveFilter[];
  sort?: AnimalSortKey;
}

export function useAnimals(options: UseAnimalsOptions = {}) {
  const { search = '', filters = [], sort = 'tag-asc' } = options;
  const { operationId } = useOperation();

  return useQuery({
    queryKey: ['animals', operationId, search, filters, sort],
    enabled: !!operationId,
    queryFn: async () => {
      let query = supabase
        .from('animals')
        .select('*')
        .eq('operation_id', operationId);

      // Full-text search across tag, breed, and EID
      const q = search.trim();
      if (q) {
        query = query.or(`tag.ilike.%${q}%,breed.ilike.%${q}%,eid.ilike.%${q}%`);
      }

      // Advanced filters (translated to server-side conditions)
      query = applyFiltersToQuery(query, filters);

      // Sort
      switch (sort) {
        case 'tag-desc':
          query = query.order('tag', { ascending: false });
          break;
        case 'breed':
          query = query.order('breed', { ascending: true }).order('tag', { ascending: true });
          break;
        default:
          query = query.order('tag', { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAnimal(id: string | undefined) {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['animal', id],
    enabled: !!id && !!operationId,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('id', id)
        .eq('operation_id', operationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAnimalCounts() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['animal-counts', operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const base = supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('operation_id', operationId);

      const [
        { count: total,  error: e1 },
        { count: active, error: e2 },
        { count: cows,   error: e3 },
        { count: bulls,  error: e4 },
      ] = await Promise.all([
        base,
        base.eq('status', 'Active'),
        base.eq('sex', 'Cow'),
        base.eq('sex', 'Bull'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      if (e4) throw e4;

      return {
        total:  total  ?? 0,
        active: active ?? 0,
        cows:   cows   ?? 0,
        bulls:  bulls  ?? 0,
      };
    },
  });
}
