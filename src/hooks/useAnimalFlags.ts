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
    enabled: !!operationId,
    queryFn: async () => {
      const base = supabase
        .from('animal_flags')
        .select('*', { count: 'exact', head: true })
        .eq('operation_id', operationId)
        .is('resolved_at', null);

      const [
        { count: management, error: e1 },
        { count: production, error: e2 },
        { count: cull, error: e3 },
      ] = await Promise.all([
        base.eq('flag_tier', 'management'),
        base.eq('flag_tier', 'production'),
        base.eq('flag_tier', 'cull'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      return {
        management: management ?? 0,
        production: production ?? 0,
        cull: cull ?? 0,
      };
    },
  });
}
