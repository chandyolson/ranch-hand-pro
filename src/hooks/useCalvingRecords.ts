import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

export function useCalvingRecords() {
  const { operationId } = useOperation();
  return useQuery({
    queryKey: ['calving-records', operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calving_records')
        .select('*, dam:animals!calving_records_dam_id_fkey(tag, tag_color, sex, type)')
        .eq('operation_id', operationId)
        .order('calving_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCalvingCounts() {
  const { operationId } = useOperation();
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  return useQuery({
    queryKey: ['calving-counts', operationId, currentYear],
    enabled: !!operationId,
    queryFn: async () => {
      const base = supabase
        .from('calving_records')
        .select('*', { count: 'exact', head: true })
        .eq('operation_id', operationId)
        .gte('calving_date', yearStart)
        .lte('calving_date', yearEnd);

      const [
        { count: total, error: e1 },
        { count: alive, error: e2 },
        { count: dead, error: e3 },
      ] = await Promise.all([
        base,
        base.eq('calf_status', 'Alive'),
        base.eq('calf_status', 'Dead'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      return { total: total ?? 0, alive: alive ?? 0, dead: dead ?? 0 };
    },
  });
}
