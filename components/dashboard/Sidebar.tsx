'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppConfig, isModuleOn } from '@/contexts/AppConfigContext';
import { useUser } from '@/contexts/UserContext';
import { FEATURE_MODULES } from '@/lib/phase6/keys';

const ADMIN_ROLES = ['super_admin', 'org_admin', 'admin'];

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', feature: null as string | null, adminOnly: false },
  { name: 'Interns', href: '/dashboard/interns', icon: '👥', feature: FEATURE_MODULES.INTERNS, adminOnly: false },
  { name: 'Projects', href: '/dashboard/projects', icon: '🏗️', feature: FEATURE_MODULES.PROJECTS, adminOnly: false },
  { name: 'Tasks', href: '/dashboard/tasks', icon: '✓', feature: FEATURE_MODULES.TASKS, adminOnly: false },
  { name: 'Activity', href: '/dashboard/activity', icon: '📋', feature: null, adminOnly: true },
  { name: 'Admin', href: '/dashboard/admin', icon: '⚙️', feature: null, adminOnly: true },
  { name: 'Profile', href: '/dashboard/profile', icon: '👤', feature: null, adminOnly: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { ui, toggles, loading } = useAppConfig();
  const { user } = useUser();

  const userRole = user?.role?.name?.toLowerCase() ?? '';
  const isAdmin = ADMIN_ROLES.includes(userRole);

  const visibleNav = navigation.filter((item) => {
    // Feature toggle check
    if (item.feature !== null && !isModuleOn(toggles, item.feature)) return false;
    // Admin-only check
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div className="flex flex-col w-64 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl border-r border-slate-700/50">
      <div className="flex items-center justify-center h-16 bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg border-b border-brand-primary/20 px-2">
        <span
          className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-blue-400 bg-clip-text text-transparent px-2 truncate"
          title={loading ? 'Kovax' : ui?.displayName ?? 'Kovax'}
        >
          {loading ? '…' : ui?.displayName ?? 'Kovax'}
        </span>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-2">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/20 scale-105'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white hover:scale-102'
              }`}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700/50">
        <div className="bg-gradient-to-br from-amber-500/10 to-blue-500/10 rounded-xl p-4 border border-amber-500/20">
          <p className="text-xs text-slate-400 mb-2">Need help?</p>
          <Link
            href="/dashboard/profile"
            className="text-xs text-amber-400 hover:text-amber-300 font-medium"
          >
            View Profile →
          </Link>
        </div>
      </div>
    </div>
  );
}
