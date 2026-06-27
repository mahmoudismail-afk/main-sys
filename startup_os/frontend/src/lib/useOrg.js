import { useState, useEffect } from 'react';
import { supabase } from './supabase';

/**
 * useOrg - Shared hook that reads the current user's organization context
 * from their Supabase JWT app_metadata claims.
 *
 * Returns: { orgId, userId, role, loading }
 *
 * Every page uses this to scope inserts and fetches to the correct tenant.
 */
export function useOrg() {
  const [orgId, setOrgId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Try app_metadata first (set by our JWT sync trigger)
        let meta = session.user.app_metadata;

        // If org is missing, force-refresh the JWT to get latest claims
        if (!meta?.organization_id) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          meta = refreshed?.session?.user?.app_metadata || {};
        }

        setOrgId(meta?.organization_id || null);
        setRole(meta?.role || null);
        setUserId(session.user.id);
      }
      setLoading(false);
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const meta = session.user.app_metadata || {};
        setOrgId(meta.organization_id || null);
        setRole(meta.role || null);
        setUserId(session.user.id);
      } else {
        setOrgId(null);
        setRole(null);
        setUserId(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { orgId, userId, role, loading };
}
