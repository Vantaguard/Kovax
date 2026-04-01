'use client';

import { useAppConfig } from '@/contexts/AppConfigContext';
import { CORE_MODULE_FEATURES, FEATURE_MODULE_LABELS } from '@/lib/phase6/keys';
import { updateFeatureToggleAction } from './actions';

export default function AdminFeatureToggles() {
  const { toggles, refresh } = useAppConfig();

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700/50">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🎛️</span>
        Module feature toggles
      </h3>
      <p className="text-slate-400 text-sm mb-4">
        Disabling a module blocks server-side access (not only navigation). Changes apply after save.
      </p>
      <div className="space-y-3">
        {CORE_MODULE_FEATURES.map((name) => {
          const isOff = toggles[name] === false;
          return (
          <form
            key={name}
            action={async (fd) => {
              await updateFeatureToggleAction(fd);
              await refresh();
            }}
            className="flex items-center justify-between gap-4 py-2 border-b border-slate-700/40 last:border-0"
          >
            <input type="hidden" name="featureName" value={name} />
            <span className="text-slate-200 text-sm font-medium">
              {FEATURE_MODULE_LABELS[name]}
            </span>
            <div className="flex items-center gap-2">
              <select
                key={`${name}-${isOff ? 'disabled' : 'enabled'}`}
                name="enabled"
                defaultValue={isOff ? 'false' : 'true'}
                className="bg-slate-900 border border-slate-600 rounded-lg text-sm text-white px-2 py-1"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
              <button
                type="submit"
                className="px-3 py-1 text-xs rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
              >
                Apply
              </button>
            </div>
          </form>
          );
        })}
      </div>
    </div>
  );
}
