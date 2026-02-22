import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { isMockOnly } from "@/lib/data-mode";

// Synthetic mock user returned when VITE_DATA_MODE=mock
const MOCK_USER = {
  id: "mock-user-id",
  email: "demo@aegis.health",
  role: "authenticated",
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
  app_metadata: {},
  user_metadata: { full_name: "Demo Clinician" },
} as unknown as User;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In mock mode, skip Supabase entirely and inject a fake user
    if (isMockOnly()) {
      setUser(MOCK_USER);
      setSession({ user: MOCK_USER } as unknown as Session);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
