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
      const { data, error } = await supabase
        .from('animal_flags')
        .select('flag_tier')
        .eq('operation_id', operationId)
        .is('resolved_at', null);
      if (error) throw error;
      const rows = data || [];
      return {
        management: rows.filter(r => r.flag_tier === 'management').length,
        production: rows.filter(r => r.flag_tier === 'production').length,
        cull: rows.filter(r => r.flag_tier === 'cull').length,
      };
    },
  });
}
