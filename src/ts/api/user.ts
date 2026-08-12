/* =====================================================
   CloudPilot Mail — Dedicated User API Client
   ===================================================== */

import type { WorkerProfile } from '../storage';
import { request, baseUrl, sha256Hex, normalizePaginatedResult } from './common';
import type { AddressItem, CreateAddressResult, MailItem, PaginatedResult, SendMailPayload } from './types';

/** Log in as user using email/username and password */
export async function loginUser(worker: WorkerProfile): Promise<string> {
  const base = baseUrl(worker);
  if (!base) throw new Error('Worker URL is empty');

  const email = (worker.username || '').trim();
  const rawPassword = worker.userPassword || '';
  const hashedPassword = await sha256Hex(rawPassword);

  const payload = {
    email: email,
    username: email,
    address: email,
    password: hashedPassword,
    cf_token: '',
  };

  const endpoints = ['/user_api/login', '/api/user/login', '/api/login'];
  let lastError: any;

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${base}${ep}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lang': 'en',
          ...(worker.sitePassword ? { 'X-Custom-Auth': worker.sitePassword, 'x-custom-auth': worker.sitePassword } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const token = typeof data === 'string' ? data : (data.token || data.jwt || data.user_token || data.data?.token || data.result?.token || data.userToken);
        if (token) {
          worker.userToken = token;
          try {
            const stored = await chrome.storage.local.get('cp_settings');
            if (stored && stored.cp_settings && stored.cp_settings.workers) {
              const workers = stored.cp_settings.workers;
              const match = workers.find((w: any) => w.id === worker.id || w.url === worker.url);
              if (match) {
                match.userToken = token;
                await chrome.storage.local.set({ cp_settings: stored.cp_settings });
              }
            }
          } catch {
            // continue
          }
          return token;
        }
      } else {
        const text = await res.text().catch(() => '');
        lastError = new Error(`Login ${res.status}: ${text || res.statusText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Login failed: Invalid credentials or server error');
}

/** List user addresses */
export async function fetchAddressesUser(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20,
  query: string = ''
): Promise<PaginatedResult<AddressItem>> {
  const endpoints = [
    '/user_api/bind_address',
    '/user_api/settings',
  ];

  let res: any;
  for (const ep of endpoints) {
    try {
      res = await request(worker, ep);
      if (res && (Array.isArray(res) || res.results || res.data || res.addresses || res.address || res.email)) {
        break;
      }
    } catch {
      // try next fallback
    }
  }

  let items: AddressItem[] = [];
  if (res) {
    if (Array.isArray(res)) {
      items = res;
    } else if (Array.isArray(res.results)) {
      items = res.results;
    } else if (Array.isArray(res.data)) {
      items = res.data;
    } else if (Array.isArray(res.addresses)) {
      items = res.addresses;
    } else if (res.address || res.email) {
      const addr = res.address || res.email;
      items = [{ id: 1, name: addr.split('@')[0], address: addr, created_at: new Date().toISOString() }];
    }
  }

  // Account email fallback if server returns empty address list
  if (items.length === 0 && worker.username) {
    const userEmail = worker.username.trim();
    items = [{
      id: 1,
      name: userEmail.split('@')[0],
      address: userEmail,
      created_at: new Date().toISOString(),
    }];
  }

  // Normalize items to ensure valid address objects
  items = items.map((item: any, idx: number) => {
    const addr = item.name || item.address || item.email || '';
    const displayAddr = addr.includes('@') ? addr : (worker.username || addr);
    const name = displayAddr.split('@')[0];
    return {
      id: item.id ?? item.address_id ?? idx + 1,
      name: name,
      address: displayAddr,
      created_at: item.created_at || item.createdAt || new Date().toISOString(),
      mail_count: item.mail_count ?? item.mailCount ?? 0,
      send_count: item.send_count ?? item.sendCount ?? 0,
    };
  });

  if (items.length > 0 && !worker.activeAddressJwt) {
    try {
      const detail = await fetchAddressDetailUser(worker, items[0].id);
      if (detail && detail.jwt) {
        worker.activeAddressJwt = detail.jwt;
      }
    } catch {
      // continue
    }
  }

  if (query) {
    const q = query.toLowerCase();
    items = items.filter(a => (a.name && a.name.toLowerCase().includes(q)) || (a.address && a.address.toLowerCase().includes(q)));
  }

  return normalizePaginatedResult<AddressItem>(items, limit, page, `${worker.id}:user:addresses:${query}`);
}

/** Fetch address credentials/JWT as user */
export async function fetchAddressDetailUser(
  worker: WorkerProfile,
  addressId: number
): Promise<any> {
  const endpoints = [
    `/user_api/bind_address_jwt/${addressId}`,
    `/api/user/bind_address_jwt/${addressId}`,
    `/user_api/bind_address_jwt?id=${addressId}`,
  ];

  for (const ep of endpoints) {
    try {
      const res = await request(worker, ep);
      if (res && res.jwt) {
        worker.activeAddressJwt = res.jwt;
        return res;
      }
    } catch {
      // try next
    }
  }

  return { jwt: worker.userToken || '' };
}

/** Fetch user settings and send balance using active address JWT */
export async function fetchUserSettingsUser(
  worker: WorkerProfile
): Promise<{ address?: string; send_balance?: number; [key: string]: any }> {
  const endpoints = ['/api/settings', '/user_api/settings'];
  for (const ep of endpoints) {
    try {
      const res = await request<any>(worker, ep);
      if (res) return res;
    } catch {
      // try next
    }
  }
  return {};
}

/** Create/bind a new address as user */
export async function createAddressUser(
  worker: WorkerProfile,
  data: {
    name: string;
    domain: string;
    enablePrefix?: boolean;
    enableRandomSubdomain?: boolean;
  }
): Promise<CreateAddressResult> {
  const payload = {
    name: data.name,
    domain: data.domain,
    cf_token: '',
    enableRandomSubdomain: data.enableRandomSubdomain ?? false,
  };

  // Step 1: Create new address and obtain address JWT
  const res = await request<CreateAddressResult>(worker, '/api/new_address', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const newJwt = (res as any)?.jwt;
  if (newJwt) {
    worker.activeAddressJwt = newJwt;

    // Step 2: Bind new address to user account using Authorization: Bearer <newJwt>
    try {
      await request(worker, '/user_api/bind_address', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes('max address count reached') || msg.toLowerCase().includes('max address')) {
        throw new Error('Max address count reached');
      }
      throw err;
    }
  }

  return res;
}

/** Delete/unbind an address as user */
export async function deleteAddressUser(
  worker: WorkerProfile,
  addressId: number
): Promise<void> {
  const endpoints = [
    { url: '/api/delete_address', method: 'DELETE' },
    { url: '/user_api/unbind_address', method: 'POST', body: JSON.stringify({ address_id: addressId, id: addressId }) },
  ];

  for (const ep of endpoints) {
    try {
      await request(worker, ep.url, { method: ep.method, body: (ep as any).body });
      return;
    } catch {
      // try next
    }
  }
}

/** Fetch user inbox emails */
export async function fetchMailsUser(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20,
  query: string = '',
  address: string = ''
): Promise<PaginatedResult<MailItem>> {
  const offset = page * limit;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (query) params.set('query', query);
  if (address) params.set('address', address);

  const endpoints = [
    `/user_api/mails?${params}`,
    `/api/mails?${params}`,
  ];

  let res: any;
  for (const ep of endpoints) {
    try {
      res = await request(worker, ep);
      if (res) break;
    } catch {
      // try next
    }
  }
  if (!res) res = { results: [], count: 0 };
  return normalizePaginatedResult<MailItem>(res, limit, page, `${worker.id}:user:inbox:${address}:${query}`);
}

/** Fetch single mail detail as user */
export async function fetchMailDetailUser(
  worker: WorkerProfile,
  mailId: number
): Promise<MailItem> {
  const endpoints = [
    `/user_api/mails/${mailId}`,
    `/api/mails/${mailId}`,
    `/api/user/mail/${mailId}`,
  ];

  for (const ep of endpoints) {
    try {
      return await request<MailItem>(worker, ep);
    } catch {
      // try next
    }
  }
  throw new Error('Failed to fetch mail detail');
}

/** Delete a mail as user */
export async function deleteMailUser(
  worker: WorkerProfile,
  mailId: number
): Promise<void> {
  const endpoints = [
    { url: `/user_api/mails/${mailId}`, method: 'DELETE' },
    { url: `/api/mails/${mailId}`, method: 'DELETE' },
    { url: `/user_api/mail/${mailId}`, method: 'DELETE' },
    { url: `/api/mail/${mailId}`, method: 'DELETE' },
  ];

  let lastErr: any;
  for (const ep of endpoints) {
    try {
      await request(worker, ep.url, { method: ep.method, body: (ep as any).body });
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to delete mail');
}

/** Fetch sent emails as user */
export async function fetchSentMailsUser(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20
): Promise<PaginatedResult<MailItem>> {
  const offset = page * limit;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });

  let res: any;
  try {
    res = await request(worker, `/api/sendbox?${params}`);
  } catch {
    res = { results: [], count: 0 };
  }
  return normalizePaginatedResult<MailItem>(res, limit, page, `${worker.id}:user:sent`);
}

/** Clear inbox emails for an address as user */
export async function clearAddressInboxUser(
  worker: WorkerProfile,
  addressId?: number,
  addressName?: string
): Promise<void> {
  const endpoints = [
    { url: '/api/clear_inbox', method: 'DELETE' },
    { url: '/user_api/clear_inbox', method: 'DELETE' },
  ];

  for (const ep of endpoints) {
    try {
      await request(worker, ep.url, { method: ep.method });
      return;
    } catch {
      // try next
    }
  }
}

/** Clear sent emails for an address as user */
export async function clearAddressSentUser(
  worker: WorkerProfile,
  addressId?: number,
  addressName?: string
): Promise<void> {
  const endpoints = [
    { url: '/api/clear_sent_items', method: 'DELETE' },
    { url: '/api/sendbox', method: 'DELETE' },
    { url: '/user_api/clear_sent_items', method: 'DELETE' },
  ];

  for (const ep of endpoints) {
    try {
      await request(worker, ep.url, { method: ep.method });
      return;
    } catch {
      // try next
    }
  }
}

/** Send email as user */
export async function sendMailUser(
  worker: WorkerProfile,
  payload: SendMailPayload
): Promise<any> {
  const fromMail = payload.from_mail || payload.from_address || '';
  const toMail = payload.to_mail || payload.to_address || '';

  const bodyObj = {
    from_name: payload.from_name ?? '',
    from_mail: fromMail,
    to_name: payload.to_name ?? '',
    to_mail: toMail,
    subject: payload.subject || '',
    content: payload.content || '',
    is_html: !!payload.is_html,
  };

  const endpoints = ['/api/send_mail', '/user_api/send_mail', '/api/user/send_mail'];
  let lastErr: any;

  for (const path of endpoints) {
    try {
      return await request(worker, path, {
        method: 'POST',
        body: JSON.stringify(bodyObj),
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to send mail');
}

/** Request send mail access */
export async function requestSendMailAccess(
  worker: WorkerProfile,
  address: string
): Promise<any> {
  const body = JSON.stringify({ address });
  try {
    return await request(worker, '/api/request_send_mail_access', { method: 'POST', body });
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.toLowerCase().includes('already requested')) {
      throw new Error('Already requested');
    }
    throw err;
  }
}
