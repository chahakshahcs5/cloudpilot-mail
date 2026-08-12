/* =====================================================
   CloudPilot Mail — Addresses View
   ===================================================== */

import { t } from '../i18n';
import { Icons } from '../icons';
import { getActiveWorker, isUser, type AppSettings } from '../storage';
import {
  fetchSettings, fetchAddresses, createAddress, deleteAddress,
  clearAddressInbox, clearAddressSent, fetchAddressDetail, requestSendMailAccess, formatDate,
  type AddressItem, type SiteSettings,
} from '../api';
import {
  $, html, escapeHtml, showToast, copyToClipboard,
  colorFromStr, emptyWorkerHtml, showConfirmDialog, renderPagination,
  generateRandomName,
} from '../utils';
import { invalidateStats } from './dashboard';

const LIMIT = 20;
let addressPage = 0;
let addressSearch = '';
let siteConfig: SiteSettings | null = null;
let currentAddresses: AddressItem[] = [];
let serverAddressTotalPages = 1;
let filteredAddrPage = 0;
let currentSettings: AppSettings | null = null;

export function invalidateSiteConfig(): void {
  siteConfig = null;
}

export async function renderAddresses(settings: AppSettings): Promise<void> {
  const panel = $('#view-addresses');
  const worker = getActiveWorker(settings);
  currentSettings = settings;
  if (!worker) { html(panel, emptyWorkerHtml()); return; }

  html(panel, `
    <div class="flex items-center justify-between mb-3">
      <h2 class="section-title" style="margin:0">${t('addr.title')}</h2>
      <button class="btn btn-primary btn-sm" id="addr-create-btn">
        ${Icons.plus} ${t('addr.create')}
      </button>
    </div>
    <div class="search-bar">
      ${Icons.search}
      <input type="text" id="addr-search-input"
        placeholder="${t('addr.search')}"
        value="${escapeHtml(addressSearch)}">
    </div>
    <div id="addr-list" class="list-container">
      <div class="loading-state"><div class="spinner"></div></div>
    </div>
    <div id="addr-pagination"></div>
  `);

  const searchInput = $('#addr-search-input') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    addressSearch = searchInput.value;
    filteredAddrPage = 0;
    renderFilteredAddressList(worker, 0);
  });

  panel.querySelector('#addr-create-btn')?.addEventListener('click', () =>
    openCreateAddressModal(worker));

  await loadAddressList(worker);
}

/* ── Address list loader ── */
async function loadAddressList(worker: import('../storage').WorkerProfile): Promise<void> {
  const listEl = $('#addr-list');

  try {
    const data = await fetchAddresses(worker, addressPage, LIMIT, '');
    currentAddresses = data.results || [];
    const total = data.count || 0;
    serverAddressTotalPages = Math.ceil(total / LIMIT) || 1;

    renderFilteredAddressList(worker, filteredAddrPage);
  } catch (err) {
    html(listEl, `<div class="error-state"><p>${escapeHtml(String(err))}</p></div>`);
  }
}

function renderFilteredAddressList(worker: import('../storage').WorkerProfile, pageIdx: number = 0): void {
  const listEl = $('#addr-list');
  const pagEl = $('#addr-pagination');
  if (!listEl) return;

  const query = addressSearch.trim().toLowerCase();
  const filtered = currentAddresses.filter(addr => {
    if (!query) return true;
    const display = (addr.address || addr.name || '').toLowerCase();
    return display.includes(query);
  });

  if (filtered.length === 0) {
    html(listEl, `
      <div class="empty-state">
        <div class="empty-state-icon">${Icons.mail}</div>
        <p class="empty-state-text">${t('addr.empty')}</p>
      </div>
    `);
    renderPagination(pagEl, 0, 1, () => {});
    return;
  }

  let displayItems: AddressItem[] = [];
  if (query) {
    const totalFilteredPages = Math.ceil(filtered.length / LIMIT) || 1;
    const curPage = Math.min(pageIdx, totalFilteredPages - 1);
    filteredAddrPage = curPage;
    displayItems = filtered.slice(curPage * LIMIT, (curPage + 1) * LIMIT);
    renderPagination(pagEl, curPage, totalFilteredPages, (p) => {
      renderFilteredAddressList(worker, p);
    });
  } else {
    displayItems = filtered;
    renderPagination(pagEl, addressPage, serverAddressTotalPages, (p) => {
      addressPage = p;
      filteredAddrPage = 0;
      loadAddressList(worker);
    });
  }

  html(listEl, displayItems.map((addr: AddressItem) => {
    const display = addr.address || addr.name || `#${addr.id}`;
    const initial = display.charAt(0);
    const bg = colorFromStr(display);
    return `
      <div class="list-item" data-addr-id="${addr.id}"
        data-addr-name="${escapeHtml(display)}">
        <div class="list-item-avatar" style="background:${bg}">
          ${escapeHtml(initial)}
        </div>
        <div class="list-item-body">
          <div class="list-item-title">${escapeHtml(display)}</div>
          <div class="list-item-subtitle">${formatDate(addr.created_at)}</div>
        </div>
        <div class="list-item-meta">
          ${addr.mail_count != null
            ? `<span class="badge badge-blue">${addr.mail_count}</span>`
            : ''}
        </div>
      </div>
    `;
  }).join(''));

  listEl.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = Number(item.getAttribute('data-addr-id'));
      const name = item.getAttribute('data-addr-name') || '';
      openAddressDetail(worker, id, name);
    });
  });
}

/* ── Create Address Modal ── */
async function openCreateAddressModal(
  worker: import('../storage').WorkerProfile
): Promise<void> {
  if (!siteConfig) {
    try {
      siteConfig = await fetchSettings(worker);
    } catch {
      showToast(t('settings.test_fail'), 'error');
      return;
    }
  }
  const domains = siteConfig.domains?.length
    ? siteConfig.domains
    : (siteConfig.defaultDomains || []);

  const modalRoot = $('#modal-root');
  html(modalRoot, `
    <div class="modal-overlay" id="create-addr-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${t('addr.create')}</h3>
          <button class="icon-btn" id="create-addr-close">${Icons.arrowLeft}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <label class="form-label" style="margin:0">${t('addr.name')}</label>
              <button type="button" class="btn btn-ghost btn-xs" id="btn-generate-fake-name" style="color:var(--cp-primary);font-size:11px">
                ✨ ${t('addr.generate_fake') || 'Generate Fake Name'}
              </button>
            </div>
            <input class="form-input" id="new-addr-name" type="text" placeholder="Input name or leave blank for random" maxlength="30">
            <p class="form-hint" style="font-size:11px">Only allow: [a-z0-9]. Leaving blank generates a random address.</p>
          </div>
          <div class="form-group">
            <label class="form-label">${t('addr.domain')}</label>
            <select class="form-select" id="new-addr-domain">
              ${domains.map((d: string) =>
                `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('addr.subdomain')}</label>
            <input class="form-input" id="new-addr-subdomain" type="text" placeholder="">
            <p class="form-hint">Leave blank if not using subdomains</p>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">${t('addr.enable_prefix')}</span>
            <label class="toggle-switch">
              <input type="checkbox" id="new-addr-prefix" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">${t('addr.random_subdomain')}</span>
            <label class="toggle-switch">
              <input type="checkbox" id="new-addr-random">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="create-addr-cancel">
            ${t('common.cancel')}
          </button>
          <button class="btn btn-primary" id="create-addr-submit">
            ${t('addr.create')}
          </button>
        </div>
      </div>
    </div>
  `);

  const close = () => html(modalRoot, '');
  modalRoot.querySelector('#create-addr-close')?.addEventListener('click', close);
  modalRoot.querySelector('#create-addr-cancel')?.addEventListener('click', close);
  modalRoot.querySelector('#create-addr-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'create-addr-overlay') close();
  });

  modalRoot.querySelector('#btn-generate-fake-name')?.addEventListener('click', () => {
    const nameInput = $('#new-addr-name') as HTMLInputElement;
    if (nameInput) nameInput.value = generateRandomName();
  });

  modalRoot.querySelector('#create-addr-submit')?.addEventListener('click', async () => {
    let name = ($('#new-addr-name') as HTMLInputElement).value.trim();
    const domainVal = ($('#new-addr-domain') as HTMLSelectElement).value;
    const subdomain = ($('#new-addr-subdomain') as HTMLInputElement).value.trim();
    const enablePrefix = ($('#new-addr-prefix') as HTMLInputElement).checked;
    const enableRandom = ($('#new-addr-random') as HTMLInputElement).checked;

    if (!name) {
      name = generateRandomName();
    } else {
      name = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
    }

    const finalDomain = subdomain ? `${subdomain}.${domainVal}` : domainVal;
    const btn = $('#create-addr-submit') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = t('addr.creating');

    try {
      const result = await createAddress(worker, {
        name, domain: finalDomain, enablePrefix,
        enableRandomSubdomain: enableRandom,
      });
      showToast(`Created: ${result.address}`, 'success');
      close();
      addressPage = 0;
      invalidateStats();
      await loadAddressList(worker);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes('max address count reached') || msg.toLowerCase().includes('max address')) {
        showToast(t('addr.max_limit_reached') || 'Maximum address count reached for your account.', 'error');
      } else {
        showToast(msg, 'error');
      }
      btn.disabled = false;
      btn.textContent = t('addr.create');
    }
  });
}

/* ── Address Detail Modal ── */
function openAddressDetail(
  worker: import('../storage').WorkerProfile,
  addressId: number,
  addressName: string
): void {
  const modalRoot = $('#modal-root');
  html(modalRoot, `
    <div class="modal-overlay" id="addr-detail-overlay">
      <div class="modal">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:8px">
            <button class="icon-btn" id="addr-detail-back">${Icons.arrowLeft}</button>
            <h3 class="modal-title truncate" style="max-width:240px">
              ${escapeHtml(addressName)}
            </h3>
          </div>
          <div></div>
        </div>
        <div class="modal-body">
          <div class="card mb-3">
            <h4 class="card-title" style="font-size:var(--cp-text-sm)">
              ${t('addr.credentials')}
            </h4>
            <div class="mt-2" style="display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-secondary btn-sm w-full" id="addr-copy-jwt">
                ${Icons.copy} ${t('addr.copy_jwt')}
              </button>
              <button class="btn btn-secondary btn-sm w-full" id="addr-copy-login">
                ${Icons.link} ${t('addr.copy_login')}
              </button>
              <button class="btn btn-secondary btn-sm w-full" id="addr-request-access">
                ${Icons.shield} ${t('send_access.request') || 'Request Send Access'}
              </button>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm" style="flex:1;padding:6px 4px;font-size:11px" id="addr-clear">
              ${Icons.trash} ${t('addr.clear_inbox')}
            </button>
            <button class="btn btn-secondary btn-sm" style="flex:1;padding:6px 4px;font-size:11px" id="addr-clear-sent">
              ${Icons.sent} ${t('addr.clear_sent') || 'Clear Sent'}
            </button>
            <button class="btn btn-danger btn-sm" style="flex:1;padding:6px 4px;font-size:11px" id="addr-delete">
              ${Icons.trash} ${t('addr.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  `);

  const close = () => html(modalRoot, '');
  modalRoot.querySelector('#addr-detail-back')?.addEventListener('click', close);
  modalRoot.querySelector('#addr-detail-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'addr-detail-overlay') close();
  });

  const getJwtToken = async (): Promise<string> => {
    const detail = await fetchAddressDetail(worker, addressId);
    if (!detail) return '';
    if (typeof detail === 'string') return detail;
    return detail.jwt || detail.addressCredential || detail.token || detail.password || JSON.stringify(detail);
  };

  modalRoot.querySelector('#addr-copy-jwt')?.addEventListener('click', async () => {
    const btn = $('#addr-copy-jwt') as HTMLButtonElement;
    btn.disabled = true;
    try {
      const jwt = await getJwtToken();
      if (!jwt) throw new Error('No JWT returned');
      await copyToClipboard(jwt);
    } catch (err) {
      showToast(String(err), 'error');
    } finally {
      btn.disabled = false;
    }
  });

  modalRoot.querySelector('#addr-copy-login')?.addEventListener('click', async () => {
    const btn = $('#addr-copy-login') as HTMLButtonElement;
    btn.disabled = true;
    const baseUrl = (worker.frontendUrl || worker.url || '').replace(/\/+$/, '');
    try {
      const jwt = await getJwtToken();
      const link = jwt
        ? `${baseUrl}/?jwt=${encodeURIComponent(jwt)}`
        : `${baseUrl}/?user=${encodeURIComponent(addressName)}`;
      await copyToClipboard(link);
    } catch {
      const link = `${baseUrl}/?user=${encodeURIComponent(addressName)}`;
      await copyToClipboard(link);
    } finally {
      btn.disabled = false;
    }
  });
  modalRoot.querySelector('#addr-request-access')?.addEventListener('click', async () => {
    const btn = modalRoot.querySelector('#addr-request-access') as HTMLButtonElement;
    if (btn) btn.disabled = true;
    try {
      // Step 1: Generate & activate Address JWT for this address first
      const detail = await fetchAddressDetail(worker, addressId);
      if (detail && detail.jwt) {
        worker.activeAddressJwt = detail.jwt;
      }
      // Step 2: Request send mail access with Authorization: Bearer <address_jwt>
      await requestSendMailAccess(worker, addressName);
      showToast(t('send_access.request_success') || 'Send access requested successfully!', 'success');
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes('already requested')) {
        showToast(t('send_access.already_requested') || 'Access has already been requested for this address.', 'info');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  modalRoot.querySelector('#addr-clear')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: t('addr.clear_inbox') || 'Clear Inbox',
      message: t('addr.clear_confirm') || 'Clear all emails for this address?',
      type: 'warning',
      confirmText: t('addr.clear_inbox') || 'Clear Inbox',
    });
    if (!ok) return;

    const btn = modalRoot.querySelector('#addr-clear') as HTMLButtonElement;
    if (btn) btn.disabled = true;

    try {
      const detail = await fetchAddressDetail(worker, addressId);
      if (detail && detail.jwt) {
        worker.activeAddressJwt = detail.jwt;
      }
      await clearAddressInbox(worker, addressId, addressName);
      showToast('Inbox cleared', 'success');
      close();
      invalidateStats();
      await loadAddressList(worker);
    } catch (err) {
      showToast(String(err), 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  modalRoot.querySelector('#addr-clear-sent')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: t('addr.clear_sent') || 'Clear Sent',
      message: t('addr.clear_sent_confirm') || 'Clear sent items for this address?',
      type: 'warning',
      confirmText: t('addr.clear_sent') || 'Clear Sent',
    });
    if (!ok) return;

    const btn = modalRoot.querySelector('#addr-clear-sent') as HTMLButtonElement;
    if (btn) btn.disabled = true;

    try {
      const detail = await fetchAddressDetail(worker, addressId);
      if (detail && detail.jwt) {
        worker.activeAddressJwt = detail.jwt;
      }
      await clearAddressSent(worker, addressId, addressName);
      showToast('Sent items cleared', 'success');
      close();
      invalidateStats();
      await loadAddressList(worker);
    } catch (err) {
      showToast(String(err), 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });


  modalRoot.querySelector('#addr-delete')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: t('addr.delete') || 'Delete Address',
      message: t('addr.delete_confirm') || 'Are you sure you want to delete this address?',
      type: 'danger',
      confirmText: t('addr.delete') || 'Delete Address',
    });
    if (!ok) return;

    const btn = modalRoot.querySelector('#addr-delete') as HTMLButtonElement;
    if (btn) btn.disabled = true;

    try {
      const detail = await fetchAddressDetail(worker, addressId);
      if (detail && detail.jwt) {
        worker.activeAddressJwt = detail.jwt;
      }
      await deleteAddress(worker, addressId);
      showToast('Address deleted', 'success');
      close();
      invalidateStats();
      await loadAddressList(worker);
    } catch (err) {
      showToast(String(err), 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
