import React, { createContext, useContext } from 'react';
import { DEV_OPERATION_ID, DEV_OPERATION_NAME } from '@/lib/dev-context';

interface OperationContextValue {
  operationId: string;
  operationName: string;
}

const OperationContext = createContext<OperationContextValue>({
  operationId: DEV_OPERATION_ID,
  operationName: DEV_OPERATION_NAME,
});

export function OperationProvider({ children }: { children: React.ReactNode }) {
  // DEV: hardcoded. When auth is wired, query operation_teams for the user's operation
  return (
    <OperationContext.Provider value={{ operationId: DEV_OPERATION_ID, operationName: DEV_OPERATION_NAME }}>
      {children}
    </OperationContext.Provider>
  );
}

export function useOperation() {
  return useContext(OperationContext);
}
