'use client';

import { useState, useTransition } from 'react';
import { updateRolePermissionsAction } from '../actions';
import { useToast } from '@/components/ui/ToastProvider';

type Perm = { id: string; module: string; action: string };

export default function PermissionsMatrix({
  roles,
  permissions,
  initialMap,
}: {
  roles: { id: string; name: string }[];
  permissions: Perm[];
  initialMap: Record<string, string[]>;
}) {
  const [map, setMap] = useState(initialMap);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const toggle = (roleId: string, permId: string, checked: boolean) => {
    setMap((prev) => {
      const cur = new Set(prev[roleId] ?? []);
      if (checked) cur.add(permId);
      else cur.delete(permId);
      return { ...prev, [roleId]: [...cur] };
    });
  };

  const save = (roleId: string, roleName: string) => {
    startTransition(async () => {
      try {
        await updateRolePermissionsAction(roleId, map[roleId] ?? []);
        toast.success(`${roleName} permissions saved successfully.`);
      } catch (err: any) {
        toast.error(`Failed to save ${roleName} permissions: ${err?.message || 'Unknown error'}`);
      }
    });
  };

  return (
    <div className="space-y-8">
      {roles.map((role) => (
        <div
          key={role.id}
          className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">{role.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {permissions.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="rounded border-slate-600"
                  checked={(map[role.id] ?? []).includes(p.id)}
                  onChange={(e) => toggle(role.id, p.id, e.target.checked)}
                />
                <span>
                  {p.module}.{p.action}
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => save(role.id, role.name)}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-900 text-sm font-semibold disabled:opacity-50"
          >
            Save {role.name}
          </button>
        </div>
      ))}
    </div>
  );
}
