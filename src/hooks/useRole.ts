import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as 'admin' | 'client') || null;
    },
    enabled: !!user,
  });

  return {
    role: role ?? null,
    isAdmin: role === 'admin',
    isClient: role === 'client',
    isLoading,
  };
}
