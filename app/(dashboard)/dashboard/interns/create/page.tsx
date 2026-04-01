import { createClient } from '@/lib/supabase/server';
import CreateInternForm from '@/app/(dashboard)/dashboard/interns/create/CreateInternForm';

export default async function CreateInternPage() {
  const supabase = await createClient();

  // Fetch users that exist in the org but do NOT have an intern profile yet
  // We do this by fetching all users and all intern profiles, then filtering.
  // In a massive app, an RPC or left join where intern_profile id IS NULL would be better.
  const [{ data: users }, { data: existingInterns }, { data: departments }] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, role:roles(name)')
      .eq('is_deleted', false),
    supabase
      .from('intern_profiles')
      .select('user_id')
      .eq('is_deleted', false),
    supabase
      .from('departments')
      .select('id, name')
      .order('name'),
  ]);

  const adminRoles = ['super_admin', 'org_admin', 'admin', 'mentor'];
  const existingInternIds = new Set(existingInterns?.map(i => i.user_id) || []);
  
  const availableUsers = (users || []).filter(u => {
    // 1. Must not already have an intern profile
    if (existingInternIds.has(u.id)) return false;
    
    // 2. Must not be an administrative account
    const roleName = (u.role as any)?.name?.toLowerCase();
    if (adminRoles.includes(roleName)) return false;
    
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto">
      <CreateInternForm 
        availableUsers={availableUsers} 
        departments={departments || []} 
      />
    </div>
  );
}
