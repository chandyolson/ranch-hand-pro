import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

export function useAnimals(statusFilter?: string) {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['animals', operationId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('animals')
        .select('*')
        .eq('operation_id', operationId)
        .order('tag', { ascending: true }).limit(5000);
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
    enabled: !!id,
  });
}

export function useAnimalCounts() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['animal-counts', operationId],
    queryFn: async () => {
      const { count: total } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('operation_id', operationId);
      const { count: active } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('operation_id', operationId)
        .eq('status', 'Active');
      return { total: total || 0, active: active || 0 };
    },
  });
}
