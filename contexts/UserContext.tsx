'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface Role {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  email: string;
  status: string;
  last_login: string | null;
  created_at: string;
  organization: Organization | null;
  role: Role | null;
  department: Department | null;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        // Handle case where user was deleted from auth.users but still has a valid JWT
        if (authError.message.toLowerCase().includes('sub claim') || authError.message.toLowerCase().includes('does not exist')) {
          console.warn('[USER_CONTEXT] User not found (deleted from backend). Cleaning session and redirecting to 404.');
          
          // Clear the session locally to prevent infinite loops
          supabase.auth.signOut().then(() => {
            window.location.href = '/404';
          });
          return;
        }
        
        console.error('Auth error:', authError);
        setUser(null);
        return;
      }

      if (!authUser) {
        setUser(null);
        return;
      }
      
      // Fetch user profile with joins - RLS ensures access
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          status,
          last_login,
          created_at,
          organization:organizations (
            id,
            name,
            slug,
            status
          ),
          role:roles (
            id,
            name
          ),
          department:departments (
            id,
            name
          )
        `)
        .eq('id', authUser.id)
        .eq('is_deleted', false)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
        return;
      }
      
      setUser({
        ...data,
        organization: Array.isArray(data.organization) ? data.organization[0] || null : data.organization,
        role: Array.isArray(data.role) ? data.role[0] || null : data.role,
        department: Array.isArray(data.department) ? data.department[0] || null : data.department,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    // Listen for auth state changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Specifically handle the case where user info is missing on refresh
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUser();
      } else if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
