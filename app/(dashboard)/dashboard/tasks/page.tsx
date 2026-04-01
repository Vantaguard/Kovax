import { getTasksPaginated, getTaskStats } from '@/services/task.service.v2';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { getMergedUiConfig } from '@/services/config.service';
import TasksClient from './TasksClient';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string; status?: string; priority?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const query = params.query || '';
  const status = params.status || '';
  const priority = params.priority || '';

  const auth = await getServerAuthContext();
  const uiConfig = auth ? await getMergedUiConfig(auth.organizationId) : null;
  const limit = uiConfig?.paginationLimit || 10;
  
  const [tasksResult, stats] = await Promise.all([
    getTasksPaginated({
      query: query || undefined,
      status: status as any || undefined,
      priority: priority as any || undefined,
      page,
      limit,
    }),
    getTaskStats(),
  ]);

  return (
    <TasksClient
      initialTasks={tasksResult.data}
      initialPagination={tasksResult.pagination}
      initialStats={stats}
      initialPage={page}
      initialQuery={query}
      initialStatus={status}
      initialPriority={priority}
    />
  );
}
