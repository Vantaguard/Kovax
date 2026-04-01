import { createClient } from '@/lib/supabase/server';
import CreateTaskForm from '@/app/(dashboard)/dashboard/tasks/create/CreateTaskForm';

export default async function CreateTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string }>;
}) {
  const { project_id } = await searchParams;
  const supabase = await createClient();

  // Fetch projects and interns for the dropdowns
  const [{ data: projects }, { data: interns }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('is_deleted', false).eq('status', 'active'),
    supabase
      .from('intern_profiles')
      .select(`
        id,
        user_id,
        user:users!user_id(
          email
        )
      `)
      .eq('is_deleted', false)
      .in('status', ['active', 'approved']),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <CreateTaskForm 
        projects={projects || []} 
        interns={interns || []} 
        initialProjectId={project_id}
      />
    </div>
  );
}
