import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/data-lifecycle/deleted
 * Returns all soft-deleted records across interns, projects, tasks.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch deleted interns
    const { data: interns } = await supabase
      .from('intern_profiles')
      .select('id, deleted_at, user:users!intern_profiles_user_id_fkey(email)')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
      .limit(50);

    // Fetch deleted projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, deleted_at')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
      .limit(50);

    // Fetch deleted tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, deleted_at')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      interns: (interns || []).map((i: any) => ({
        id: i.id,
        label: (Array.isArray(i.user) ? i.user[0]?.email : i.user?.email) || i.id,
        deleted_at: i.deleted_at,
      })),
      projects: (projects || []).map((p: any) => ({
        id: p.id,
        label: p.name || p.id,
        deleted_at: p.deleted_at,
      })),
      tasks: (tasks || []).map((t: any) => ({
        id: t.id,
        label: t.title || t.id,
        deleted_at: t.deleted_at,
      })),
    });
  } catch (error: any) {
    console.error('Error in /api/data-lifecycle/deleted:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
