import { getInternsPaginated, getInternStats } from '@/services/intern.service.v2';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { getMergedUiConfig } from '@/services/config.service';
import InternsClient from '@/app/(dashboard)/dashboard/interns/InternsClient';

export default async function InternsPage({
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
  
  const [internsResult, stats] = await Promise.all([
    getInternsPaginated({
      query: query || undefined,
      status: status as any || undefined,
      page,
      limit,
    }),
    getInternStats(),
  ]);

  return (
    <InternsClient
      initialInterns={internsResult.data}
      initialPagination={internsResult.pagination}
      initialStats={stats}
      initialPage={page}
      initialQuery={query}
      initialStatus={status}
    />
  );
}
