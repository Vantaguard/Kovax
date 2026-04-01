import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getServerAuthContext();
  
  if (!ctx) {
    redirect('/login');
  }

  // Consistent Admin check (case-insensitive)
  const role = ctx.roleName?.toLowerCase() || '';
  const isAdmin = role === 'admin' || role === 'org_admin' || role === 'super_admin';

  if (!isAdmin) {
    // Return a server-side access denied block so no data leaks
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-slate-700/50 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-2xl font-bold text-white mb-4">Access Denied</h3>
          <p className="text-slate-400">
            You do not have permission to access the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
