import React, { createContext, useContext } from 'react';
import { DEV_OPERATION_ID, DEV_OPERATION_NAME, DEV_OPERATION_TYPE } from '@/lib/dev-context';

interface OperationContextValue {
  operationId: string;
  operationName: string;
  operationType: string;
}

const OperationContext = createContext<OperationContextValue>({
  operationId: DEV_OPERATION_ID,
  operationName: DEV_OPERATION_NAME,
  operationType: DEV_OPERATION_TYPE,
});

export function OperationProvider({ children }: { children: React.ReactNode }) {
  // DEV: hardcoded. When auth is wired, query operation_teams for the user's operation
  return (
    <OperationContext.Provider value={{ operationId: DEV_OPERATION_ID, operationName: DEV_OPERATION_NAME, operationType: DEV_OPERATION_TYPE }}>
      {children}
    </OperationContext.Provider>
  );
}

export function useOperation() {
  return useContext(OperationContext);
}
