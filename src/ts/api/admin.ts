/* =====================================================
   CloudPilot Mail — Admin API Client
   ===================================================== */

import type { WorkerProfile } from '../storage';
import { request, normalizePaginatedResult } from './common';
import type { AddressItem, AdminStats, CreateAddressResult, MailItem, PaginatedResult, SendAccessItem, SendMailPayload } from './types';

/** Fetch admin statistics */
export async function fetchStatsAdmin(worker: WorkerProfile): Promise<AdminStats> {
  let raw: any = {};
  try {
    raw = await request<any>(worker, '/admin/statistics');
  } catch {
    try {
      raw = await request<any>(worker, '/admin/address_count');
    } catch {
      raw = {};
    }
  }

  return {
    address_count: raw.addressCount ?? raw.address_count ?? 0,
    mail_count: raw.mailCount ?? raw.mail_count ?? 0,
    send_count: raw.sendMailCount ?? raw.send_count ?? raw.send_mail_count ?? 0,
    user_count: raw.userCount ?? raw.user_count ?? 0,
    unknow_mail_count: raw.unknowMailCount ?? raw.unknow_mail_count ?? 0,
  };
}

/** List addresses (admin) */
export async function fetchAddressesAdmin(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20,
  query: string = ''
): Promise<PaginatedResult<AddressItem>> {
  const offset = page * limit;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (query) params.set('query', query);

  const endpoints = [`/admin/address?${params}`, `/admin/address_list?${params}`];
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
  return normalizePaginatedResult<AddressItem>(res, limit, page, `${worker.id}:admin:addresses:${query}`);
}

/** Create address (admin) */
export async function createAddressAdmin(
  worker: WorkerProfile,
  data: {
    name: string;
    domain: string;
    enablePrefix?: boolean;
    enableRandomSubdomain?: boolean;
  }
): Promise<CreateAddressResult> {
  return request<CreateAddressResult>(worker, '/admin/new_address', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      domain: data.domain,
      enablePrefix: data.enablePrefix ?? true,
      enableRandomSubdomain: data.enableRandomSubdomain ?? false,
    }),
  });
}

/** Delete address (admin) */
export async function deleteAddressAdmin(
  worker: WorkerProfile,
  addressId: number
): Promise<void> {
  const endpoints = [
    { url: `/admin/delete_address/${addressId}`, method: 'DELETE' },
    { url: `/admin/address/${addressId}`, method: 'DELETE' },
    { url: `/admin/delete_address/${addressId}`, method: 'POST' },
    { url: '/admin/delete_address', method: 'POST', body: JSON.stringify({ id: addressId }) },
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
  throw lastErr || new Error('Failed to delete address');
}

/** Fetch address credentials/password (admin) */
export async function fetchAddressDetailAdmin(
  worker: WorkerProfile,
  addressId: number
): Promise<any> {
  try {
    return await request(worker, `/admin/show_password/${addressId}`);
  } catch (e1) {
    try {
      return await request(worker, `/admin/show_password?id=${addressId}`);
    } catch {
      try {
        return await request(worker, `/admin/address/${addressId}`);
      } catch {
        throw e1;
      }
    }
  }
}

/** Clear all emails for an address (admin) */
export async function clearAddressInboxAdmin(
  worker: WorkerProfile,
  addressId: number,
  addressName?: string
): Promise<void> {
  const queryAddr = addressName ? encodeURIComponent(addressName) : '';

  const endpoints = [
    { url: `/admin/clear_inbox/${addressId}`, method: 'DELETE' },
    { url: `/admin/clear_inbox?id=${addressId}`, method: 'DELETE' },
    { url: `/admin/mails_cleanup?address_id=${addressId}`, method: 'POST', body: JSON.stringify({ address_id: addressId, address: addressName }) },
    { url: `/admin/mails?address_id=${addressId}`, method: 'DELETE' },
    ...(queryAddr ? [{ url: `/admin/mails?address=${queryAddr}`, method: 'DELETE' }] : []),
  ];

  for (const ep of endpoints) {
    try {
      await request(worker, ep.url, { method: ep.method, body: ep.body });
      return;
    } catch {
      // try next
    }
  }
}

/** Fetch inbox emails (admin) */
export async function fetchMailsAdmin(
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

  const res = await request(worker, `/admin/mails?${params}`);
  return normalizePaginatedResult<MailItem>(res, limit, page, `${worker.id}:admin:inbox:${address}:${query}`);
}

/** Fetch single mail detail (admin) */
export async function fetchMailDetailAdmin(
  worker: WorkerProfile,
  mailId: number
): Promise<MailItem> {
  const endpoints = [`/admin/mails/${mailId}`, `/admin/mail/${mailId}`];
  for (const ep of endpoints) {
    try {
      return await request<MailItem>(worker, ep);
    } catch {
      // try next
    }
  }
  throw new Error('Failed to fetch mail detail');
}

/** Delete a mail (admin) */
export async function deleteMailAdmin(
  worker: WorkerProfile,
  mailId: number
): Promise<void> {
  const endpoints = [
    { url: `/admin/mails/${mailId}`, method: 'DELETE' },
    { url: `/admin/delete_mail/${mailId}`, method: 'DELETE' },
    { url: `/admin/mail/${mailId}`, method: 'DELETE' },
    { url: '/admin/delete_mail', method: 'POST', body: JSON.stringify({ id: mailId }) },
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

/** Fetch sent emails (admin) */
export async function fetchSentMailsAdmin(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20,
  address: string = ''
): Promise<PaginatedResult<MailItem>> {
  const offset = page * limit;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (address) params.set('address', address);
  const res = await request(worker, `/admin/sendbox?${params}`);
  return normalizePaginatedResult<MailItem>(res, limit, page, `${worker.id}:admin:sent:${address}`);
}

/** Clear sent emails for an address (admin) */
export async function clearAddressSentAdmin(
  worker: WorkerProfile,
  addressId: number,
  addressName?: string
): Promise<void> {
  const queryAddr = addressName ? encodeURIComponent(addressName) : '';

  const endpoints = [
    { url: `/admin/clear_sendbox/${addressId}`, method: 'DELETE' },
    { url: `/admin/sendbox?address_id=${addressId}`, method: 'DELETE' },
    ...(queryAddr ? [{ url: `/admin/sendbox?address=${queryAddr}`, method: 'DELETE' }] : []),
    { url: `/admin/sendbox/${addressId}`, method: 'DELETE' },
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

/** Fetch unknown-address emails (admin) */
export async function fetchUnknownMailsAdmin(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20
): Promise<PaginatedResult<MailItem>> {
  const offset = page * limit;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await request(worker, `/admin/mails_unknow?${params}`);
  return normalizePaginatedResult<MailItem>(res, limit, page, `${worker.id}:admin:unknown`);
}

/** Send email (admin) */
export async function sendMailAdmin(
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

  return request(worker, '/admin/send_mail', {
    method: 'POST',
    body: JSON.stringify(bodyObj),
  });
}

/** Fetch Sender Access list (admin) */
export async function fetchSendAccessList(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20
): Promise<PaginatedResult<SendAccessItem>> {
  const offset = page * limit;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });

  let res: any;
  try {
    res = await request(worker, `/admin/address_sender?${params}`);
  } catch {
    try {
      res = await request(worker, `/admin/send_access?${params}`);
    } catch {
      try {
        res = await request(worker, `/admin/send_access_list?${params}`);
      } catch {
        res = { results: [], count: 0 };
      }
    }
  }
  return normalizePaginatedResult<SendAccessItem>(res, limit, page, `${worker.id}:admin:address_sender`);
}

/** Create Sender Access entry (admin) */
export async function createSendAccess(
  worker: WorkerProfile,
  data: { address: string; balance: number; is_enabled: boolean; address_id?: number }
): Promise<void> {
  const body = JSON.stringify({
    address: data.address,
    address_id: data.address_id ?? 0,
    balance: Number(data.balance),
    enabled: data.is_enabled ? 1 : 0,
  });

  try {
    await request(worker, '/admin/address_sender', { method: 'POST', body });
  } catch (e1) {
    try {
      await request(worker, '/admin/send_access', { method: 'POST', body });
    } catch {
      throw e1;
    }
  }
}

/** Update Sender Access entry (admin) */
export async function updateSendAccess(
  worker: WorkerProfile,
  id: number,
  data: { balance: number; is_enabled: boolean; address?: string }
): Promise<void> {
  const body = JSON.stringify({
    address: data.address || '',
    address_id: id,
    balance: Number(data.balance),
    enabled: data.is_enabled ? 1 : 0,
  });

  try {
    await request(worker, '/admin/address_sender', { method: 'POST', body });
  } catch (e1) {
    try {
      await request(worker, '/admin/send_access', { method: 'POST', body });
    } catch {
      throw e1;
    }
  }
}

/** Delete Sender Access entry (admin) */
export async function deleteSendAccess(
  worker: WorkerProfile,
  id: number,
  address?: string
): Promise<void> {
  const queryAddr = address ? encodeURIComponent(address) : '';
  const endpoints = [
    { url: `/admin/address_sender/${id}`, method: 'DELETE' },
    { url: `/admin/address_sender?id=${id}`, method: 'DELETE' },
    ...(queryAddr ? [{ url: `/admin/address_sender?address=${queryAddr}`, method: 'DELETE' }] : []),
    { url: '/admin/address_sender', method: 'DELETE', body: JSON.stringify({ id, address }) },
    { url: '/admin/address_sender', method: 'POST', body: JSON.stringify({ id, action: 'delete' }) },
  ];

  for (const ep of endpoints) {
    try {
      await request(worker, ep.url, { method: ep.method, body: ep.body });
      return;
    } catch {
      // try next fallback
    }
  }
}
