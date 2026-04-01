import ModuleDisabled from '@/components/ModuleDisabled';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { FEATURE_MODULES } from '@/lib/phase6/keys';
import { isModuleEnabled } from '@/services/feature-toggle.service';

export default async function ProjectsModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getServerAuthContext();
  if (!ctx) return <>{children}</>;

  const enabled = await isModuleEnabled(ctx.organizationId, FEATURE_MODULES.PROJECTS);
  if (!enabled) {
    return <ModuleDisabled name="Projects" />;
  }

  return <>{children}</>;
}
