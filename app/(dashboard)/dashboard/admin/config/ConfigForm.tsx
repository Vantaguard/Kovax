'use client';

import { useAppConfig } from '@/contexts/AppConfigContext';
import type { MergedUiConfig } from '@/contexts/AppConfigContext';
import { updateOrgConfigAction } from '../actions';

export default function ConfigForm({ initialUi }: { initialUi: MergedUiConfig }) {
  const { refresh } = useAppConfig();

  return (
    <form
      action={async (fd) => {
        await updateOrgConfigAction(fd);
        await refresh();
      }}
      className="space-y-6 max-w-xl"
    >
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">Application name</label>
        <input
          name="displayName"
          defaultValue={initialUi.displayName}
          className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-600 text-white"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Primary theme</label>
          <input
            name="themePrimary"
            type="color"
            defaultValue={initialUi.themePrimary}
            className="w-full h-10 rounded-xl cursor-pointer bg-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Accent</label>
          <input
            name="themeAccent"
            type="color"
            defaultValue={initialUi.themeAccent}
            className="w-full h-10 rounded-xl cursor-pointer bg-transparent"
          />
        </div>
      </div>
      <button
        type="submit"
        className="px-6 py-2 rounded-xl bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400"
      >
        Save configuration
      </button>
    </form>
  );
}
