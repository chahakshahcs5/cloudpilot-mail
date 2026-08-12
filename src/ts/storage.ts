/* =====================================================
   CloudPilot Mail — Storage Layer
   ===================================================== */

export interface WorkerProfile {
  id: string;
  name: string;
  url: string;
  adminPassword?: string;
  sitePassword?: string;
  username?: string;
  userPassword?: string;
  userToken?: string;
  activeAddressJwt?: string;
  frontendUrl: string;
  domains: string[];
}

export interface AppSettings {
  workers: WorkerProfile[];
  activeWorkerId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoRefreshInterval: number; // seconds, 0 = off
  role: 'admin' | 'user' | null;  // null = not yet chosen (first launch)
}

const STORAGE_KEY = 'cp_settings';

const defaultSettings: AppSettings = {
  workers: [],
  activeWorkerId: '',
  theme: 'system',
  language: 'en',
  autoRefreshInterval: 30,
  role: null,
};

let currentActiveRole: 'admin' | 'user' | null = null;

export function setActiveRole(role: 'admin' | 'user' | null): void {
  currentActiveRole = role;
}

export function getActiveRole(): 'admin' | 'user' | null {
  return currentActiveRole;
}

/** Load all settings */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      const settings = { ...defaultSettings, ...result[STORAGE_KEY] };
      setActiveRole(settings.role);
      return settings;
    }
  } catch {
    // fallback
  }
  const settings = { ...defaultSettings };
  setActiveRole(settings.role);
  return settings;
}

/** Save all settings */
export async function saveSettings(settings: AppSettings): Promise<void> {
  setActiveRole(settings.role);
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

/** Get workers filtered by the current role */
export function getWorkersForRole(settings: AppSettings): WorkerProfile[] {
  const currentRole = settings.role || 'user';
  return settings.workers.filter(w => {
    if (w.role) return w.role === currentRole;
    if (currentRole === 'admin') return Boolean(w.adminPassword);
    return Boolean(w.username || w.userToken || !w.adminPassword);
  });
}

/** Get the currently active worker profile for the active role */
export function getActiveWorker(settings: AppSettings): WorkerProfile | null {
  const roleWorkers = getWorkersForRole(settings);
  if (roleWorkers.length === 0) return null;
  const match = roleWorkers.find((w) => w.id === settings.activeWorkerId);
  return match || roleWorkers[0] || null;
}

/** Generate a unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** Add a new worker */
export function addWorker(
  settings: AppSettings,
  worker: Omit<WorkerProfile, 'id'>
): AppSettings {
  const currentRole = settings.role || 'user';
  const newWorker: WorkerProfile = { role: currentRole, ...worker, id: generateId() };
  const updated = {
    ...settings,
    workers: [...settings.workers, newWorker],
  };
  const roleWorkers = getWorkersForRole(updated);
  if (roleWorkers.length > 0 && !roleWorkers.some(w => w.id === updated.activeWorkerId)) {
    updated.activeWorkerId = newWorker.id;
  }
  return updated;
}

/** Update an existing worker */
export function updateWorker(
  settings: AppSettings,
  id: string,
  partial: Partial<Omit<WorkerProfile, 'id'>>
): AppSettings {
  return {
    ...settings,
    workers: settings.workers.map((w) => (w.id === id ? { ...w, ...partial } : w)),
  };
}

/** Remove a worker */
export function removeWorker(settings: AppSettings, id: string): AppSettings {
  const workers = settings.workers.filter((w) => w.id !== id);
  const updated = { ...settings, workers };
  const roleWorkers = getWorkersForRole(updated);
  let activeWorkerId = updated.activeWorkerId;
  if (!roleWorkers.some(w => w.id === activeWorkerId)) {
    activeWorkerId = roleWorkers[0]?.id ?? '';
  }
  return { ...updated, activeWorkerId };
}

export function isAdmin(settings: AppSettings): boolean {
  return settings.role === 'admin';
}

export function isUser(settings: AppSettings): boolean {
  return settings.role === 'user';
}
