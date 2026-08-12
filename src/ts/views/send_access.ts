/* =====================================================
   CloudPilot Mail — Sender Access Control View
   ===================================================== */

import { t } from '../i18n';
import { Icons } from '../icons';
import { getActiveWorker, type AppSettings, type WorkerProfile } from '../storage';
import {
  fetchSendAccessList, createSendAccess, updateSendAccess, deleteSendAccess,
  fetchAddresses, formatDate, type SendAccessItem
} from '../api';
import {
  $, html, escapeHtml, showToast, renderPagination,
  emptyWorkerHtml, showConfirmDialog, extractAddressString, colorFromStr
} from '../utils';

const LIMIT = 20;
let accessPage = 0;
let accessSearch = '';
let currentAccessItems: SendAccessItem[] = [];
let serverAccessTotalPages = 1;
let filteredAccessPage = 0;

export async function renderSendAccess(settings: AppSettings): Promise<void> {
  const panel = $('#view-send_access');
  const worker = getActiveWorker(settings);
  if (!worker) { html(panel, emptyWorkerHtml()); return; }

  html(panel, `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:12px;white-space:nowrap">
      <h2 class="section-title" style="margin:0;white-space:nowrap;font-size:12px;letter-spacing:0.02em;overflow:hidden;text-overflow:ellipsis">${t('send_access.title') || 'Sender Access Control'}</h2>
      <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
        <button class="btn btn-primary btn-sm" id="send-access-add-btn" style="white-space:nowrap;padding:4px 8px;font-size:12px">
          ${Icons.plus} ${t('send_access.add') || 'Sender Access'}
        </button>
        <button class="btn btn-ghost btn-sm" id="send-access-refresh-btn" style="white-space:nowrap;padding:4px 6px">
          ${Icons.refresh} ${t('common.refresh') || 'Refresh'}
        </button>
      </div>
    </div>

    <div class="search-bar">
      ${Icons.search}
      <input type="text" id="send-access-search-input" placeholder="${t('addr.search') || 'Search addresses...'}" value="${escapeHtml(accessSearch)}">
    </div>

    <div id="send-access-list" class="list-container">
      <div class="loading-state"><div class="spinner"></div></div>
    </div>
    <div id="send-access-pagination"></div>
  `);

  const searchInput = $('#send-access-search-input') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    accessSearch = searchInput.value;
    filteredAccessPage = 0;
    renderFilteredAccessList(worker, 0);
  });

  panel.querySelector('#send-access-refresh-btn')?.addEventListener('click', async () => {
    const btn = $('#send-access-refresh-btn') as HTMLButtonElement;
    if (btn) btn.disabled = true;
    showToast('Refreshing sender access...', 'info');
    await loadSendAccessList(worker);
    if (btn) btn.disabled = false;
  });

  panel.querySelector('#send-access-add-btn')?.addEventListener('click', () => {
    openAddSendAccessModal(worker);
  });

  await loadSendAccessList(worker);
}

async function loadSendAccessList(worker: WorkerProfile): Promise<void> {
  const listEl = $('#send-access-list');

  try {
    const data = await fetchSendAccessList(worker, accessPage, LIMIT);
    currentAccessItems = data.results || [];
    const total = data.count || 0;
    serverAccessTotalPages = Math.ceil(total / LIMIT) || 1;

    renderFilteredAccessList(worker, filteredAccessPage);
  } catch (err) {
    html(listEl, `<div class="error-state"><p>${escapeHtml(String(err))}</p></div>`);
  }
}

function renderFilteredAccessList(worker: WorkerProfile, pageIdx: number = 0): void {
  const listEl = $('#send-access-list');
  const pagEl = $('#send-access-pagination');
  if (!listEl) return;

  const query = accessSearch.trim().toLowerCase();
  const filtered = currentAccessItems.filter(item => {
    if (!query) return true;
    return (item.address || '').toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    html(listEl, `
      <div class="empty-state">
        <div class="empty-state-icon">${Icons.shield}</div>
        <p class="empty-state-text">${t('send_access.empty') || 'No sender access records'}</p>
      </div>
    `);
    renderPagination(pagEl, 0, 1, () => {});
    return;
  }

  let displayItems: SendAccessItem[] = [];
  if (query) {
    const totalFilteredPages = Math.ceil(filtered.length / LIMIT) || 1;
    const curPage = Math.min(pageIdx, totalFilteredPages - 1);
    filteredAccessPage = curPage;
    displayItems = filtered.slice(curPage * LIMIT, (curPage + 1) * LIMIT);
    renderPagination(pagEl, curPage, totalFilteredPages, (p) => {
      renderFilteredAccessList(worker, p);
    });
  } else {
    displayItems = filtered;
    renderPagination(pagEl, accessPage, serverAccessTotalPages, (p) => {
      accessPage = p;
      filteredAccessPage = 0;
      loadSendAccessList(worker);
    });
  }

  html(listEl, displayItems.map(item => {
    const display = item.address || `#${item.id}`;
    const initial = display.charAt(0);
    const bg = colorFromStr(display);
    const isEnabled = item.is_enabled !== false && (item as any).enabled !== 0;
    const balance = item.balance ?? 0;

    return `
      <div class="list-item" data-access-id="${item.id}">
        <div class="list-item-avatar" style="background:${bg}">${escapeHtml(initial)}</div>
        <div class="list-item-body">
          <div class="list-item-title">${escapeHtml(display)}</div>
          <div class="list-item-subtitle" style="display:flex;align-items:center;gap:6px;margin-top:2px">
            <span>Quota: <strong>${balance}</strong></span>
            <span>•</span>
            <span class="badge ${isEnabled ? 'badge-green' : 'badge-amber'}">
              ${isEnabled ? (t('send_access.enabled') || 'Enabled') : (t('send_access.disabled') || 'Disabled')}
            </span>
          </div>
        </div>
        <div class="list-item-meta" style="display:flex;gap:4px;align-items:center">
          <button class="btn btn-ghost btn-xs btn-modify" data-id="${item.id}" style="color:var(--cp-primary);font-weight:600">
            ${t('send_access.modify') || 'Modify'}
          </button>
          <button class="btn btn-ghost btn-xs btn-delete" data-id="${item.id}" style="color:#EF4444">
            ${Icons.trash}
          </button>
        </div>
      </div>
    `;
  }).join(''));

  listEl.querySelectorAll('.btn-modify').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.getAttribute('data-id'));
      const item = currentAccessItems.find(i => i.id === id);
      if (item) openModifySendAccessModal(worker, item);
    });
  });

  listEl.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.getAttribute('data-id'));
      const ok = await showConfirmDialog({
        title: t('common.delete') || 'Delete',
        message: 'Delete sender access record for this address?',
        type: 'danger',
        confirmText: t('common.delete') || 'Delete',
      });
      if (!ok) return;
      try {
        const item = currentAccessItems.find(i => i.id === id);
        await deleteSendAccess(worker, id, item?.address);
        showToast('Sender access record deleted', 'success');
        await loadSendAccessList(worker);
      } catch (err) {
        showToast(String(err), 'error');
      }
    });
  });
}

function openModifySendAccessModal(worker: WorkerProfile, item: SendAccessItem): void {
  const modalRoot = $('#modal-root');
  const isEnabled = item.is_enabled !== false && (item as any).enabled !== 0;

  html(modalRoot, `
    <div class="modal-overlay" id="modify-access-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${t('send_access.modify') || 'Modify Sender Access'}</h3>
          <button class="icon-btn" id="modify-access-close">${Icons.trash}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">${t('addr.name') || 'Address'}</label>
            <input type="text" class="form-input" value="${escapeHtml(item.address)}" disabled style="opacity:0.75">
          </div>
          <div class="form-group mt-3">
            <label class="form-label">${t('send_access.balance') || 'Balance (Sending Quota)'}</label>
            <input type="number" class="form-input" id="modify-access-balance" value="${item.balance ?? 3}" min="0">
          </div>
          <div class="form-group mt-3" style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="modify-access-enabled" ${isEnabled ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer">
            <label for="modify-access-enabled" style="cursor:pointer;font-size:13px;font-weight:500;user-select:none">
              ${t('send_access.is_enabled') || 'Is Enabled'}
            </label>
          </div>
          <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
            <button class="btn btn-ghost" id="modify-access-cancel">${t('common.cancel') || 'Cancel'}</button>
            <button class="btn btn-primary" id="modify-access-save">${t('common.save') || 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  `);

  const close = () => html(modalRoot, '');
  modalRoot.querySelector('#modify-access-close')?.addEventListener('click', close);
  modalRoot.querySelector('#modify-access-cancel')?.addEventListener('click', close);
  modalRoot.querySelector('#modify-access-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'modify-access-overlay') close();
  });

  modalRoot.querySelector('#modify-access-save')?.addEventListener('click', async () => {
    const balance = Number(($('#modify-access-balance') as HTMLInputElement).value || 0);
    const is_enabled = ($('#modify-access-enabled') as HTMLInputElement).checked;

    const btn = $('#modify-access-save') as HTMLButtonElement;
    btn.disabled = true;

    try {
      await updateSendAccess(worker, item.id, { balance, is_enabled, address: item.address });
      showToast('Sender access updated', 'success');
      close();
      await loadSendAccessList(worker);
    } catch (err) {
      showToast(String(err), 'error');
      btn.disabled = false;
    }
  });
}

async function openAddSendAccessModal(worker: WorkerProfile): Promise<void> {
  const modalRoot = $('#modal-root');
  
  let existingAddresses: string[] = [];
  try {
    const data = await fetchAddresses(worker, 0, 100);
    const set = new Set<string>();
    for (const item of (data.results || [])) {
      const addr = extractAddressString(item);
      if (addr) set.add(addr);
    }
    existingAddresses = Array.from(set).sort();
  } catch { /* ignore */ }

  const optionsHtml = existingAddresses.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');

  html(modalRoot, `
    <div class="modal-overlay" id="add-access-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${t('send_access.add') || 'Add Sender Access'}</h3>
          <button class="icon-btn" id="add-access-close">${Icons.trash}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">${t('addr.name') || 'Address'}</label>
            ${existingAddresses.length > 0 ? `
              <select class="form-select" id="add-access-address-select" style="margin-bottom:8px">
                <option value="">-- Select from existing --</option>
                ${optionsHtml}
              </select>
              <input type="email" class="form-input" id="add-access-address-input" placeholder="Or type custom address e.g. user@domain.com">
            ` : `
              <input type="email" class="form-input" id="add-access-address-input" placeholder="e.g. user@domain.com">
            `}
          </div>
          <div class="form-group mt-3">
            <label class="form-label">${t('send_access.balance') || 'Balance (Sending Quota)'}</label>
            <input type="number" class="form-input" id="add-access-balance" value="3" min="0">
          </div>
          <div class="form-group mt-3" style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="add-access-enabled" checked style="width:16px;height:16px;cursor:pointer">
            <label for="add-access-enabled" style="cursor:pointer;font-size:13px;font-weight:500;user-select:none">
              ${t('send_access.is_enabled') || 'Is Enabled'}
            </label>
          </div>
          <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
            <button class="btn btn-ghost" id="add-access-cancel">${t('common.cancel') || 'Cancel'}</button>
            <button class="btn btn-primary" id="add-access-save">${t('send_access.add') || 'Add Sender Access'}</button>
          </div>
        </div>
      </div>
    </div>
  `);

  const close = () => html(modalRoot, '');
  modalRoot.querySelector('#add-access-close')?.addEventListener('click', close);
  modalRoot.querySelector('#add-access-cancel')?.addEventListener('click', close);
  modalRoot.querySelector('#add-access-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'add-access-overlay') close();
  });

  const selectEl = $('#add-access-address-select') as HTMLSelectElement | null;
  const inputEl = $('#add-access-address-input') as HTMLInputElement | null;

  if (selectEl && inputEl) {
    selectEl.addEventListener('change', () => {
      if (selectEl.value) {
        inputEl.value = selectEl.value;
      }
    });
  }

  modalRoot.querySelector('#add-access-save')?.addEventListener('click', async () => {
    const address = (inputEl?.value.trim() || selectEl?.value || '').trim();
    const balance = Number(($('#add-access-balance') as HTMLInputElement).value || 3);
    const is_enabled = ($('#add-access-enabled') as HTMLInputElement).checked;

    if (!address) {
      showToast('Please specify an address', 'error');
      return;
    }

    const btn = $('#add-access-save') as HTMLButtonElement;
    btn.disabled = true;

    try {
      await createSendAccess(worker, { address, balance, is_enabled });
      showToast('Sender access record created', 'success');
      close();
      await loadSendAccessList(worker);
    } catch (err) {
      showToast(String(err), 'error');
      btn.disabled = false;
    }
  });
}
