import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperation } from '@/contexts/OperationContext';

// Get all active members of a specific group
export function useGroupMembers(groupId: string | undefined) {
  const { operationId } = useOperation();

  return useQuery({
    queryKey: ['group-members', groupId, operationId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('animal_groups')
        .select(`
          id,
          animal_id,
          start_date,
          animals!inner (
            id, tag, tag_color, eid, sex, breed, type, status, year_born
          )
        `)
        .eq('group_id', groupId)
        .eq('operation_id', operationId)
        .is('end_date', null)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

// Get active member count for a group (for Expected Head auto-fill)
export function useGroupMemberCount(groupId: string | undefined) {
  const { operationId } = useOperation();

  return useQuery({
    queryKey: ['group-member-count', groupId, operationId],
    queryFn: async () => {
      if (!groupId) return 0;

      const { count, error } = await supabase
        .from('animal_groups')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('operation_id', operationId)
        .is('end_date', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!groupId,
  });
}

// Get all groups an animal belongs to
export function useAnimalGroupMemberships(animalId: string | undefined) {
  return useQuery({
    queryKey: ['animal-groups', animalId],
    queryFn: async () => {
      if (!animalId) return [];

      const { data, error } = await supabase
        .from('animal_groups')
        .select(`
          id,
          start_date,
          end_date,
          source,
          groups!inner (id, name, cattle_type)
        `)
        .eq('animal_id', animalId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!animalId,
  });
}
