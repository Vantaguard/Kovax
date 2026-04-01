export default function ModuleDisabled({ name }: { name: string }) {
  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-slate-700/50 text-center max-w-lg mx-auto">
      <div className="text-5xl mb-4">⏸️</div>
      <h2 className="text-2xl font-bold text-white mb-2">{name} is disabled</h2>
      <p className="text-slate-400">
        This module has been turned off for your organization. Contact an administrator if you need access.
      </p>
    </div>
  );
}
