import { getProjectsPaginated, getProjectStats } from '@/services/project.service.v2';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { getMergedUiConfig } from '@/services/config.service';
import ProjectsClient from './ProjectsClient';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const query = params.query || '';
  const status = params.status || '';

  const auth = await getServerAuthContext();
  const uiConfig = auth ? await getMergedUiConfig(auth.organizationId) : null;
  const limit = uiConfig?.paginationLimit || 10;
  
  const [projectsResult, stats] = await Promise.all([
    getProjectsPaginated({
      query: query || undefined,
      status: status as any || undefined,
      page,
      limit,
    }),
    getProjectStats(),
  ]);

  return (
    <ProjectsClient
      initialProjects={projectsResult.data}
      initialPagination={projectsResult.pagination}
      initialStats={stats}
      initialPage={page}
      initialQuery={query}
      initialStatus={status}
    />
  );
}
