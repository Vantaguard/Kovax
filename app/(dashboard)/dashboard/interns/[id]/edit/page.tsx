import { getInternById } from '@/services/intern.service.v2';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditInternForm from '@/app/(dashboard)/dashboard/interns/[id]/edit/EditInternForm';

export default async function EditInternPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const [intern, { data: departments }] = await Promise.all([
    getInternById(id),
    supabase
      .from('departments')
      .select('id, name')
      .order('name'),
  ]);

  if (!intern) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/interns/${id}`}
          className="p-2 bg-slate-800/60 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700/50"
        >
          ←
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-white">Edit Intern Profile</h2>
          <p className="text-slate-400 mt-1">Modify intern information</p>
        </div>
      </div>

      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700/50">
        <EditInternForm intern={intern} departments={departments || []} />
      </div>
    </div>
  );
}
