import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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

export const ANIMALS_PAGE_SIZE = 100;

export function useAnimals(options: UseAnimalsOptions = {}) {
  const { search = '', filters = [], sort = 'tag-asc' } = options;
  const { operationId } = useOperation();

  return useInfiniteQuery({
    queryKey: ['animals', operationId, search, filters, sort],
    enabled: !!operationId,
    initialPageParam: 0,
    getNextPageParam: (lastPage: unknown[], allPages: unknown[][]) => {
      if (lastPage.length < ANIMALS_PAGE_SIZE) return undefined;
      return allPages.length * ANIMALS_PAGE_SIZE;
    },
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      let query = supabase
        .from('animals')
        .select('*')
        .eq('operation_id', operationId);

      const q = search.trim();
      if (q) {
        query = query.or(`tag.ilike.%${q}%,breed.ilike.%${q}%,eid.ilike.%${q}%`);
      }

      query = applyFiltersToQuery(query, filters);

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

      const { data, error } = await query.range(pageParam, pageParam + ANIMALS_PAGE_SIZE - 1);
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
