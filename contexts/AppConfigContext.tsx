'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export interface MergedUiConfig {
  displayName: string;
  themePrimary: string;
  themeAccent: string;
  paginationLimit: number;
  showStats: boolean;
}

interface AppConfigState {
  ui: MergedUiConfig | null;
  toggles: Record<string, boolean>;
  permissions: { module: string; action: string }[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const defaultUi: MergedUiConfig = {
  displayName: 'Kovax',
  themePrimary: '#f59e0b',
  themeAccent: '#38bdf8',
  paginationLimit: 10,
  showStats: true,
};

const AppConfigContext = createContext<AppConfigState | undefined>(undefined);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [ui, setUi] = useState<MergedUiConfig | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [permissions, setPermissions] = useState<{ module: string; action: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/app-shell?_t=${timestamp}`, { 
        credentials: 'include',
        cache: 'no-store'
      });
      if (!res.ok) {
        setUi(defaultUi);
        setToggles({});
        setPermissions([]);
        return;
      }
      const data = await res.json();
      setUi(data.ui ?? defaultUi);
      setToggles(data.toggles ?? {});
      setPermissions(data.permissions ?? []);
    } catch (e) {
      console.error(e);
      setError('Failed to load configuration');
      setUi(defaultUi);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Convert hex to comma-separated RGB
  const hexToRgb = (hex: string) => {
    let rawStr = hex.replace('#', '');
    if (rawStr.length === 3) rawStr = rawStr.split('').map(c => c + c).join('');
    const num = parseInt(rawStr, 16);
    return `${num >> 16} ${(num >> 8) & 255} ${num & 255}`;
  };

  return (
    <AppConfigContext.Provider value={{ ui, toggles, permissions, loading, error, refresh }}>
      {ui && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --theme-primary: ${hexToRgb(ui.themePrimary)};
            --theme-accent: ${hexToRgb(ui.themeAccent)};
          }
        `}} />
      )}
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    throw new Error('useAppConfig must be used within AppConfigProvider');
  }
  return ctx;
}

export function isModuleOn(toggles: Record<string, boolean>, key: string): boolean {
  if (Object.prototype.hasOwnProperty.call(toggles, key)) {
    return toggles[key] === true;
  }
  return true;
}
