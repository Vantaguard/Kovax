'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { processLogout } from '@/app/(public)/login/actions';
import NotificationBell from '@/components/dashboard/NotificationBell';

export default function Navbar() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { ui, loading: cfgLoading } = useAppConfig();

  const handleSignOut = async () => {
    await processLogout();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getRoleBadgeColor = (roleName: string | undefined) => {
    switch (roleName?.toLowerCase()) {
      case 'super_admin':
        return 'bg-red-900/50 text-red-300 border border-red-500/30';
      case 'org_admin':
      case 'admin':
        return 'bg-purple-900/50 text-purple-300 border border-purple-500/30';
      case 'mentor':
        return 'bg-blue-900/50 text-blue-300 border border-blue-500/30';
      case 'intern':
        return 'bg-green-900/50 text-green-300 border border-green-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border border-slate-500/30';
    }
  };

  return (
    <div className="bg-slate-900 shadow-xl border-b border-slate-700/50">
      <div className="px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-brand-primary">
              {cfgLoading ? 'Dashboard' : ui?.displayName ?? 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="w-8 h-8 bg-slate-700 rounded-lg animate-pulse"></div>
                <div className="w-32 h-4 bg-slate-700 rounded animate-pulse"></div>
              </div>
            ) : user ? (
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-slate-900 text-sm font-bold">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">{user.email}</span>
                  {user.role && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.role.name)}`}>
                      {user.role.name.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            ) : null}
            <NotificationBell />
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-slate-900 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

