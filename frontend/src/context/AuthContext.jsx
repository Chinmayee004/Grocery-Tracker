import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isConfigured: false,
  continueAsDemo: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing demo session in localStorage first
    const savedDemo = localStorage.getItem('grocery_demo_session');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setUser(parsed.user);
        setSession(parsed);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('grocery_demo_session');
      }
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check active session on initial load
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error('[AUTH] Failed to get session:', error.message);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    });

    // Listen to real-time auth changes (sign-in, token refresh, sign-out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const continueAsDemo = (email = 'demo@grocerytracker.local') => {
    const demoUser = {
      id: 'demo-user-001',
      email: email.trim() || 'demo@grocerytracker.local',
      user_metadata: { name: 'Demo Shopper' },
      isDemo: true,
    };
    const demoSession = {
      access_token: 'demo-token',
      user: demoUser,
    };
    localStorage.setItem('grocery_demo_session', JSON.stringify(demoSession));
    setUser(demoUser);
    setSession(demoSession);
    return demoSession;
  };

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      // Automatic fallback for testing without Supabase
      return continueAsDemo(email);
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password) => {
    if (!isSupabaseConfigured) {
      // Automatic fallback for testing without Supabase
      return continueAsDemo(email);
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    localStorage.removeItem('grocery_demo_session');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AUTH] Error during supabase signOut:', err);
      }
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        continueAsDemo,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
