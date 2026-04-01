import { getTaskById } from '@/services/task.service.v2';
import { getProjectsPaginated } from '@/services/project.service.v2';
import { getInternsPaginated } from '@/services/intern.service.v2';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditTaskForm from '@/app/(dashboard)/dashboard/tasks/[id]/edit/EditTaskForm';

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) {
    notFound();
  }

  // Get project and intern lists for dropdowns
  const [projectsRes, internsRes] = await Promise.all([
    getProjectsPaginated({ page: 1, limit: 100 }),
    getInternsPaginated({ page: 1, limit: 100 }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/tasks/${id}`}
          className="p-2 bg-slate-800/60 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700/50"
        >
          ←
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-white">Edit Task</h2>
          <p className="text-slate-400 mt-1">Modify task details</p>
        </div>
      </div>

      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700/50">
        <EditTaskForm 
          task={task} 
          projects={projectsRes.data} 
          interns={internsRes.data} 
        />
      </div>
    </div>
  );
}
