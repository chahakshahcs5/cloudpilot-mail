/* =====================================================
   CloudPilot Mail — API Facade / Router
   ===================================================== */

import type { WorkerProfile } from '../storage';
import { request } from './common';
import type { AddressItem, AdminStats, CreateAddressResult, MailItem, PaginatedResult, SendMailPayload, SiteSettings, TestConnectionResult } from './types';
import * as UserAPI from './user';
import * as AdminAPI from './admin';

// Export all types and common utilities
export * from './types';
export * from './common';
export { UserAPI, AdminAPI };

import { getActiveRole, type WorkerProfile } from '../storage';

/** Helper to determine if current session operates in User mode */
export function isUserModeWorker(worker: WorkerProfile): boolean {
  const role = getActiveRole();
  if (role === 'user') return true;
  if (role === 'admin') return false;
  return !worker.adminPassword || !!(worker.userToken || (worker.username && worker.userPassword));
}

/** Log in user */
export const loginUser = UserAPI.loginUser;

/** Fetch site settings */
export async function fetchSettings(worker: WorkerProfile): Promise<SiteSettings> {
  try {
    return await request<SiteSettings>(worker, '/open_api/settings');
  } catch (e1) {
    try {
      return await request<SiteSettings>(worker, '/api/settings');
    } catch (e2) {
      throw e1 || e2;
    }
  }
}

/** Test connection to a worker */
export async function testConnection(worker: WorkerProfile): Promise<TestConnectionResult> {
  try {
    await fetchSettings(worker);
    if (worker.username && worker.userPassword) {
      try {
        const token = await loginUser(worker);
        worker.userToken = token;
      } catch (userErr: any) {
        return {
          ok: false,
          error: `Site reached, but User Login failed: ${userErr?.message || String(userErr)}`,
        };
      }
    } else if (worker.adminPassword) {
      try {
        await AdminAPI.fetchAddressesAdmin(worker, 0, 1);
      } catch (adminErr: any) {
        const msg = String(adminErr?.message || adminErr);
        if (msg.includes('401')) {
          return {
            ok: false,
            error: `Site reached, but Admin Auth failed (401 Unauthorized). Please check Admin Password.`,
          };
        }
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Fetch statistics */
export async function fetchStats(worker: WorkerProfile): Promise<AdminStats> {
  if (isUserModeWorker(worker)) {
    return { address_count: 0, mail_count: 0, send_count: 0, user_count: 0 };
  }
  return AdminAPI.fetchStatsAdmin(worker);
}

/** Fetch addresses */
export async function fetchAddresses(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20,
  query: string = ''
): Promise<PaginatedResult<AddressItem>> {
  if (isUserModeWorker(worker)) {
    return UserAPI.fetchAddressesUser(worker, page, limit, query);
  }
  return AdminAPI.fetchAddressesAdmin(worker, page, limit, query);
}

/** Create a new address */
export async function createAddress(
  worker: WorkerProfile,
  data: {
    name: string;
    domain: string;
    enablePrefix?: boolean;
    enableRandomSubdomain?: boolean;
  }
): Promise<CreateAddressResult> {
  if (isUserModeWorker(worker)) {
    return UserAPI.createAddressUser(worker, data);
  }
  return AdminAPI.createAddressAdmin(worker, data);
}

/** Delete an address */
export async function deleteAddress(
  worker: WorkerProfile,
  addressId: number
): Promise<void> {
  if (isUserModeWorker(worker)) {
    return UserAPI.deleteAddressUser(worker, addressId);
  }
  return AdminAPI.deleteAddressAdmin(worker, addressId);
}

/** Get address credentials/detail */
export async function fetchAddressDetail(
  worker: WorkerProfile,
  addressId: number
): Promise<any> {
  if (isUserModeWorker(worker)) {
    return UserAPI.fetchAddressDetailUser(worker, addressId);
  }
  return AdminAPI.fetchAddressDetailAdmin(worker, addressId);
}

/** Clear address inbox */
export async function clearAddressInbox(
  worker: WorkerProfile,
  addressId: number,
  addressName?: string
): Promise<void> {
  if (isUserModeWorker(worker)) {
    return UserAPI.clearAddressInboxUser(worker, addressId, addressName);
  }
  return AdminAPI.clearAddressInboxAdmin(worker, addressId, addressName);
}

/** Clear address sent items */
export async function clearAddressSent(
  worker: WorkerProfile,
  addressId: number,
  addressName?: string
): Promise<void> {
  if (isUserModeWorker(worker)) {
    return UserAPI.clearAddressSentUser(worker, addressId, addressName);
  }
  return AdminAPI.clearAddressSentAdmin(worker, addressId, addressName);
}

/** Fetch inbox emails */
export async function fetchMails(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20,
  query: string = '',
  address: string = ''
): Promise<PaginatedResult<MailItem>> {
  if (isUserModeWorker(worker)) {
    return UserAPI.fetchMailsUser(worker, page, limit, query, address);
  }
  return AdminAPI.fetchMailsAdmin(worker, page, limit, query, address);
}

/** Fetch single mail detail */
export async function fetchMailDetail(
  worker: WorkerProfile,
  mailId: number
): Promise<MailItem> {
  if (isUserModeWorker(worker)) {
    return UserAPI.fetchMailDetailUser(worker, mailId);
  }
  return AdminAPI.fetchMailDetailAdmin(worker, mailId);
}

/** Delete a mail */
export async function deleteMail(
  worker: WorkerProfile,
  mailId: number
): Promise<void> {
  if (isUserModeWorker(worker)) {
    return UserAPI.deleteMailUser(worker, mailId);
  }
  return AdminAPI.deleteMailAdmin(worker, mailId);
}

/** Fetch sent emails */
export async function fetchSentMails(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20,
  address: string = ''
): Promise<PaginatedResult<MailItem>> {
  if (isUserModeWorker(worker)) {
    return UserAPI.fetchSentMailsUser(worker, page, limit, address);
  }
  return AdminAPI.fetchSentMailsAdmin(worker, page, limit, address);
}

/** Fetch unknown-address emails */
export async function fetchUnknownMails(
  worker: WorkerProfile,
  page: number = 0,
  limit: number = 20
): Promise<PaginatedResult<MailItem>> {
  if (isUserModeWorker(worker)) {
    return { results: [], count: 0 };
  }
  return AdminAPI.fetchUnknownMailsAdmin(worker, page, limit);
}

/** Send an email */
export async function sendMail(
  worker: WorkerProfile,
  payload: SendMailPayload
): Promise<any> {
  if (isUserModeWorker(worker)) {
    return UserAPI.sendMailUser(worker, payload);
  }
  return AdminAPI.sendMailAdmin(worker, payload);
}

// Re-export Admin-specific access control functions
export const fetchSendAccessList = AdminAPI.fetchSendAccessList;
export const createSendAccess = AdminAPI.createSendAccess;
export const updateSendAccess = AdminAPI.updateSendAccess;
export const deleteSendAccess = AdminAPI.deleteSendAccess;

// Re-export User-specific functions
export const requestSendMailAccess = UserAPI.requestSendMailAccess;
export const fetchUserSettingsUser = UserAPI.fetchUserSettingsUser;
