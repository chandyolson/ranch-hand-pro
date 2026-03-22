import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEV_OPERATION_ID, DEV_OPERATION_NAME } from '@/lib/dev-context';

interface OperationContextValue {
  operationId: string;
  operationName: string;
  operationType: string;
}

const OperationContext = createContext<OperationContextValue>({
  operationId: DEV_OPERATION_ID,
  operationName: DEV_OPERATION_NAME,
  operationType: '',
});

export function OperationProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ['operation_meta', DEV_OPERATION_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operations')
        .select('operation_type')
        .eq('id', DEV_OPERATION_ID)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <OperationContext.Provider value={{
      operationId: DEV_OPERATION_ID,
      operationName: DEV_OPERATION_NAME,
      operationType: data?.operation_type ?? '',
    }}>
      {children}
    </OperationContext.Provider>
  );
}

export function useOperation() {
  return useContext(OperationContext);
}
