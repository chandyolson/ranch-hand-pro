import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

export function useAnimalFlags(animalId: string | undefined) {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['animal-flags', animalId],
    queryFn: async () => {
      if (!animalId) return [];
      const { data, error } = await supabase
        .from('animal_flags')
        .select('*')
        .eq('animal_id', animalId)
        .eq('operation_id', operationId)
        .is('resolved_at', null);
      if (error) throw error;
      return data;
    },
    enabled: !!animalId,
  });
}

export function useFlagCounts() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['flag-counts', operationId],
    queryFn: async () => {
      const countByTier = async (tier: string) => {
        const { count } = await supabase
          .from('animal_flags')
          .select('*', { count: 'exact', head: true })
          .eq('operation_id', operationId)
          .eq('flag_tier', tier)
          .is('resolved_at', null);
        return count || 0;
      };
      const [management, production, cull] = await Promise.all([
        countByTier('management'),
        countByTier('production'),
        countByTier('cull'),
      ]);
      return { management, production, cull };
    },
  });
}
