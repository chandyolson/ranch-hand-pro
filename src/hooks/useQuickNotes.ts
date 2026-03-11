import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

export function useQuickNotes() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['quick-notes', operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_notes')
        .select('*')
        .eq('operation_id', operationId)
        .order('note', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
