import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  profile_type: 'loueur' | 'locataire' | null;
  avatar_url: string | null;
}

interface UserRole {
  role: 'admin' | 'moderator' | 'user';
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      // Fetch profile and roles in parallel
      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data as UserProfile);
      }

      if (rolesResult.data) {
        setRoles(rolesResult.data as UserRole[]);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    fetchUserData(user.id);
  }, [user, fetchUserData]);

  // Écouter les changements de session auth pour forcer le rafraîchissement
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const isAdmin = roles.some(r => r.role === 'admin');
  const isOwner = profile?.profile_type === 'loueur';
  const isRenter = profile?.profile_type === 'locataire';

  // Fonction pour forcer le rafraîchissement manuellement
  const refreshProfile = useCallback(() => {
    if (user) {
      fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  return {
    profile,
    roles,
    isAdmin,
    isOwner,
    isRenter,
    loading,
    user,
    refreshProfile
  };
};
