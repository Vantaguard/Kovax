/**
 * Database key constants for Phase 6 — values always loaded from DB at runtime.
 */
export const CONFIG_KEYS = {
  APP_DISPLAY_NAME: 'app.display_name',
  THEME_PRIMARY: 'theme.primary',
  THEME_ACCENT: 'theme.accent',
  DEFAULTS_PAGINATION_LIMIT: 'defaults.pagination_limit',
  DEFAULTS_SHOW_STATS: 'defaults.show_stats',
} as const;

export const FEATURE_MODULES = {
  INTERNS: 'module_interns',
  PROJECTS: 'module_projects',
  TASKS: 'module_tasks',
} as const;

export type FeatureModuleName = (typeof FEATURE_MODULES)[keyof typeof FEATURE_MODULES];

/** Core SaaS modules (safe to import from client components — no server deps). */
export const CORE_MODULE_FEATURES: FeatureModuleName[] = [
  FEATURE_MODULES.INTERNS,
  FEATURE_MODULES.PROJECTS,
  FEATURE_MODULES.TASKS,
];

/** Maps feature toggle DB name → permission module for CRUD checks */
export const FEATURE_TO_PERMISSION_MODULE: Record<FeatureModuleName, string> = {
  [FEATURE_MODULES.INTERNS]: 'interns',
  [FEATURE_MODULES.PROJECTS]: 'projects',
  [FEATURE_MODULES.TASKS]: 'tasks',
};

/** UI labels (DB keys stay `module_*`) */
export const FEATURE_MODULE_LABELS: Record<FeatureModuleName, string> = {
  [FEATURE_MODULES.INTERNS]: 'Interns',
  [FEATURE_MODULES.PROJECTS]: 'Projects',
  [FEATURE_MODULES.TASKS]: 'Tasks',
};
