import { createClient } from '@/lib/supabase/server';
import { getMergedUiConfig } from '@/services/config.service';
import ConfigForm from './ConfigForm';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function AdminConfigPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: admin } = await supabase.rpc('is_admin');
  if (!admin) redirect('/dashboard');

  const { data: u } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!u?.organization_id) return null;

  const ui = await getMergedUiConfig(u.organization_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <Link href="/dashboard/admin" className="hover:text-amber-400">
          ← Admin
        </Link>
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white">Organization configuration</h2>
        <p className="text-slate-400 mt-1">
          Branding and defaults are stored in the database — no hardcoded UI labels.
        </p>
      </div>
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8">
        <ConfigForm initialUi={ui} />
      </div>
    </div>
  );
}
