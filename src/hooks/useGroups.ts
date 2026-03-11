import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

export function useGroups() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['groups', operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('operation_id', operationId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
