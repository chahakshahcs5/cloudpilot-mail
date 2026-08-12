/* =====================================================
   CloudPilot Mail — API Common Helpers
   ===================================================== */

import { getActiveRole, type WorkerProfile } from '../storage';

export function baseUrl(worker: WorkerProfile): string {
  let url = (worker.url || '').trim().replace(/\/+$/, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export interface RequestOptions extends RequestInit {
  isUserRole?: boolean;
}

export function buildHeaders(worker: WorkerProfile, isUserRole?: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-lang': 'en',
  };

  const isUser = isUserRole !== undefined ? isUserRole : (getActiveRole() === 'user');

  if (isUser) {
    // ==========================================
    // USER MODE HEADERS (Strictly User ONLY)
    // ==========================================
    if (worker.userToken) {
      headers['x-user-token'] = worker.userToken;
    }
    const bearerToken = worker.activeAddressJwt || worker.userToken;
    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }
  } else {
    // ==========================================
    // ADMIN MODE HEADERS (Strictly Admin ONLY)
    // ==========================================
    if (worker.adminPassword) {
      headers['x-admin-auth'] = worker.adminPassword;
      headers['Authorization'] = `Bearer ${worker.adminPassword}`;
    }
  }

  if (worker.sitePassword) {
    headers['x-custom-auth'] = worker.sitePassword;
  }

  return headers;
}

export async function request<T>(
  worker: WorkerProfile,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const base = baseUrl(worker);
  if (!base) throw new Error('Worker URL is empty');

  let isUser = false;
  if (options.isUserRole !== undefined) {
    isUser = options.isUserRole;
  } else if (path.startsWith('/user_api')) {
    isUser = true;
  } else if (path.startsWith('/admin')) {
    isUser = false;
  } else {
    isUser = getActiveRole() === 'user';
  }

  // Auto-login if user credentials exist but userToken is missing (User mode only)
  if (isUser && !worker.userToken && worker.username && worker.userPassword && !path.includes('/login')) {
    try {
      const { loginUser } = await import('./user');
      const token = await loginUser(worker);
      worker.userToken = token;
    } catch {
      // continue
    }
  }

  const url = `${base}${path}`;
  const getHeaders = () => ({
    ...buildHeaders(worker, isUser),
    ...(options.headers as Record<string, string> | undefined),
  });

  let res = await fetch(url, {
    ...options,
    headers: getHeaders(),
  });

  // Auto-retry once on 401 Unauthorized for User mode only
  if (isUser && res.status === 401 && worker.username && worker.userPassword && !path.includes('/login')) {
    try {
      const { loginUser } = await import('./user');
      const token = await loginUser(worker);
      worker.userToken = token;
      res = await fetch(url, {
        ...options,
        headers: getHeaders(),
      });
    } catch {
      // continue
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/** SHA-256 Hex Digest Helper */
export async function sha256Hex(str: string): Promise<string> {
  if (!str) return '';
  if (/^[a-f0-9]{64}$/i.test(str)) return str.toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const knownTotalsMap = new Map<string, number>();

export function normalizePaginatedResult<T>(
  res: any,
  limit: number = 20,
  currentPage: number = 0,
  cacheKey?: string
): PaginatedResult<T> {
  if (!res) return { results: [], count: 0 };

  const results: T[] = Array.isArray(res)
    ? res
    : (res.results || res.data || res.items || []);

  let rawCount = Array.isArray(res)
    ? res.length
    : (res.count ?? res.total ?? res.totalCount ?? res.total_count);

  const loadedSoFar = currentPage * limit + results.length;

  if (typeof rawCount === 'number' && rawCount > 0 && rawCount >= loadedSoFar) {
    if (cacheKey) knownTotalsMap.set(cacheKey, rawCount);
    return { results, count: rawCount };
  }

  if (results.length < limit) {
    const finalTotal = loadedSoFar;
    if (cacheKey) knownTotalsMap.set(cacheKey, finalTotal);
    return { results, count: finalTotal };
  }

  if (cacheKey && knownTotalsMap.has(cacheKey)) {
    const cachedTotal = knownTotalsMap.get(cacheKey)!;
    if (cachedTotal >= loadedSoFar) {
      return { results, count: cachedTotal };
    }
  }

  const estimatedCount = (currentPage + 2) * limit;
  return { results, count: estimatedCount };
}

export function extractVerificationCode(text: string): string | null {
  if (!text) return null;
  const clean = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/------=_Part_[^\r\n]*/g, ' ')
    .replace(/Content-Type:[^\r\n]*/gi, ' ')
    .replace(/Content-Transfer-Encoding:[^\r\n]*/gi, ' ');

  const patterns = [
    /(?:verification\s*code|security\s*code|confirm\s*code|login\s*code|otp|pin|验证码|驗證碼|密码|碼|码)[:\s：\-]*([A-Za-z0-9]{4,8})/i,
    /(?:is|为|為)[:\s：]*([0-9]{4,8})\b/i,
  ];

  for (const p of patterns) {
    const m = clean.match(p);
    if (m?.[1]) {
      const code = m[1].trim();
      if (!/^[0-9a-f]{32}$/i.test(code) && !/^Part_/i.test(code)) {
        return code;
      }
    }
  }
  return null;
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;

    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
