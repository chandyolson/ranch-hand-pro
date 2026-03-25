import React, { createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface OperationContextValue {
  operationId: string;
  operationName: string;
  operationType: string;
  userRole: string;
}

const OperationContext = createContext<OperationContextValue>({
  operationId: '',
  operationName: '',
  operationType: '',
  userRole: '',
});

export function OperationProvider({ children }: { children: React.ReactNode }) {
  const { activeOperation } = useAuth();

  return (
    <OperationContext.Provider value={{
      operationId: activeOperation?.id ?? '',
      operationName: activeOperation?.name ?? '',
      operationType: activeOperation?.operation_type ?? '',
      userRole: activeOperation?.user_type ?? '',
    }}>
      {children}
    </OperationContext.Provider>
  );
}

export function useOperation() {
  return useContext(OperationContext);
}

export function useCanEdit() {
  const { userRole } = useOperation();
  return ['admin', 'operator', 'veterinarian', 'member'].includes(userRole);
}

export function useCanDelete() {
  const { userRole } = useOperation();
  return ['admin', 'operator'].includes(userRole);
}

export function useIsAdmin() {
  const { userRole } = useOperation();
  return ['admin', 'operator'].includes(userRole);
}

export function useIsVet() {
  const { userRole } = useOperation();
  return userRole === 'veterinarian';
}
