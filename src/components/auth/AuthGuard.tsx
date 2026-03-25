import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, activeOperation, operations, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div
          className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: '#E8E4DC', borderTopColor: '#0E2646' }}
        />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!activeOperation && operations.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!activeOperation && operations.length > 0) {
    return <Navigate to="/operation-picker" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
