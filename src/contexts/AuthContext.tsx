import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  default_operation_id: string | null;
}

interface UserOperation {
  id: string;
  name: string;
  operation_type: string;
  user_type: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  operations: UserOperation[];
  activeOperation: UserOperation | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchOperation: (operationId: string) => Promise<void>;
  setActiveOperation: (op: UserOperation | null) => void;
  reloadOperations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  userProfile: null,
  operations: [],
  activeOperation: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  switchOperation: async () => {},
  setActiveOperation: () => {},
  reloadOperations: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [operations, setOperations] = useState<UserOperation[]>([]);
  const [activeOperation, setActiveOperation] = useState<UserOperation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Load user profile
      const { data: profile } = await (supabase as any)
        .from('user_profiles')
        .select('id, user_id, display_name, phone, avatar_url, default_operation_id')
        .eq('user_id', userId)
        .single();

      setUserProfile(profile ?? null);

      // Load operations via operation_teams
      const { data: teams } = await (supabase as any)
        .from('operation_teams')
        .select('user_type, operation_id, operations(id, name, operation_type)')
        .eq('user_id', userId);

      const ops: UserOperation[] = (teams ?? [])
        .filter((t: any) => t.operations)
        .map((t: any) => ({
          id: t.operations.id,
          name: t.operations.name,
          operation_type: t.operations.operation_type,
          user_type: t.user_type,
        }));

      setOperations(ops);

      // Set active operation
      const defaultId = profile?.default_operation_id;
      const defaultOp = defaultId ? ops.find((o: UserOperation) => o.id === defaultId) : null;
      if (defaultOp) {
        setActiveOperation(defaultOp);
      } else if (ops.length === 1) {
        setActiveOperation(ops[0]);
      } else {
        setActiveOperation(null);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Set loading before deferred data load to prevent AuthGuard
        // from seeing empty operations and redirecting to onboarding
        setIsLoading(true);
        // Defer to avoid Supabase client deadlock
        setTimeout(() => loadUserData(newSession.user.id), 0);
      } else {
        setUserProfile(null);
        setOperations([]);
        setActiveOperation(null);
        setIsLoading(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        loadUserData(existingSession.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error as Error | null };

    // Profile is created by the handle_new_user trigger, no manual insert needed
    return { error: null };
  };

  const signOutFn = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserProfile(null);
    setOperations([]);
    setActiveOperation(null);
  };

  const switchOperation = async (operationId: string) => {
    const op = operations.find((o) => o.id === operationId);
    if (op) {
      setActiveOperation(op);
      // Save preference
      if (userProfile) {
        await (supabase as any)
          .from('user_profiles')
          .update({ default_operation_id: operationId })
          .eq('user_id', user?.id);
      }
    }
  };

  const reloadOperations = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      userProfile,
      operations,
      activeOperation,
      isLoading,
      signIn,
      signUp,
      signOut: signOutFn,
      switchOperation,
      setActiveOperation,
      reloadOperations,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
