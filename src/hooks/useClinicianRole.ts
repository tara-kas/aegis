import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useClinicianRole() {
  const { user } = useAuth();
  const [isClinician, setIsClinician] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsClinician(false);
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "clinician")
        .maybeSingle();

      setIsClinician(!!data && !error);
      setLoading(false);
    };

    checkRole();
  }, [user]);

  return { isClinician, loading };
}
