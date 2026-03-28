import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

// Single page cap. Screens that need all records should implement
// cursor/range pagination rather than raising this constant.
const ANIMALS_PAGE_LIMIT = 500;

export function useAnimals(statusFilter?: string) {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['animals', operationId, statusFilter],
    enabled: !!operationId,
    queryFn: async () => {
      let query = supabase
        .from('animals')
        .select('*')
        .eq('operation_id', operationId)
        .order('tag', { ascending: true })
        .limit(ANIMALS_PAGE_LIMIT);
      if (statusFilter && statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
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
      const [
        { count: total, error: totalError },
        { count: active, error: activeError },
      ] = await Promise.all([
        supabase
          .from('animals')
          .select('*', { count: 'exact', head: true })
          .eq('operation_id', operationId),
        supabase
          .from('animals')
          .select('*', { count: 'exact', head: true })
          .eq('operation_id', operationId)
          .eq('status', 'Active'),
      ]);
      if (totalError) throw totalError;
      if (activeError) throw activeError;

      return { total: total ?? 0, active: active ?? 0 };
    },
  });
}
