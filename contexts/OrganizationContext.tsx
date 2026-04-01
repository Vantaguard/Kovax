'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
}

interface OrganizationStats {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  totalInterns: number;
}

interface OrganizationContextType {
  organization: Organization | null;
  stats: OrganizationStats;
  loading: boolean;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrganizationStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalTasks: 0,
    totalInterns: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get authenticated user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Auth error:', authError);
        return;
      }
      
      // Get user's organization_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .eq('is_deleted', false)
        .single();
      
      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        return;
      }
      
      // Fetch organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData.organization_id)
        .single();
      
      if (orgError) {
        console.error('Error fetching organization:', orgError);
      } else {
        setOrganization(orgData);
      }
      
      // Fetch organization statistics - RLS automatically filters by organization
      const [
        usersResult,
        projectsResult,
        tasksResult,
        internsResult
      ] = await Promise.all([
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('is_deleted', false),
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('is_deleted', false),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('is_deleted', false),
        supabase
          .from('intern_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('is_deleted', false)
      ]);
      
      setStats({
        totalUsers: usersResult.count || 0,
        totalProjects: projectsResult.count || 0,
        totalTasks: tasksResult.count || 0,
        totalInterns: internsResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  const refreshOrganization = async () => {
    await fetchOrganization();
  };

  return (
    <OrganizationContext.Provider value={{ organization, stats, loading, refreshOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
