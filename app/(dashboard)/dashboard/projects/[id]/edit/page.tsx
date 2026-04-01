import { getProjectById } from '@/services/project.service.v2';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditProjectForm from '@/app/(dashboard)/dashboard/projects/[id]/edit/EditProjectForm';

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/projects/${id}`}
          className="p-2 bg-slate-800/60 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700/50"
        >
          ←
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-white">Edit Project</h2>
          <p className="text-slate-400 mt-1">Modify project details</p>
        </div>
      </div>

      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700/50">
        <EditProjectForm project={project} />
      </div>
    </div>
  );
}
