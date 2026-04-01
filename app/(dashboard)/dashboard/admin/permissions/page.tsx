import { createClient } from '@/lib/supabase/server';
import { getPermissions, getRoles, getRolePermissions } from '@/services/organization.service';
import PermissionsMatrix from './PermissionsMatrix';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function AdminPermissionsPage() {
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

  const orgId = u.organization_id;

  const [allRoles, allPermissions] = await Promise.all([getRoles(), getPermissions()]);

  const orgRoles = allRoles.filter((r) => r.organization_id === orgId);

  const initialMap: Record<string, string[]> = {};
  for (const r of orgRoles) {
    const rp = await getRolePermissions(r.id);
    initialMap[r.id] = rp
      .map((p) => {
        if (!p || typeof p !== 'object') return null;
        const perm = p as { id?: string };
        return perm.id ?? null;
      })
      .filter((id): id is string => !!id);
  }

  const permRows = allPermissions.map((p) => ({
    id: p.id,
    module: p.module,
    action: p.action,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <Link href="/dashboard/admin" className="hover:text-amber-400">
          ← Admin
        </Link>
      </div>
      <div>
        <h2 className="text-3xl font-bold text-white">Role permissions</h2>
        <p className="text-slate-400 mt-1">
          Assign module actions from the database. Enforcement is in the service layer.
        </p>
      </div>
      <PermissionsMatrix
        roles={orgRoles.map((r) => ({ id: r.id, name: r.name }))}
        permissions={permRows}
        initialMap={initialMap}
      />
    </div>
  );
}
