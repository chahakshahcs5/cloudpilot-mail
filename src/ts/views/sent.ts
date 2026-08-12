/* =====================================================
   CloudPilot Mail — Sent View
   ===================================================== */

import { t } from '../i18n';
import { Icons } from '../icons';
import { getActiveWorker, isUser, type AppSettings, type WorkerProfile } from '../storage';
import { fetchSentMails, fetchAddresses, formatDate } from '../api';
import {
  $, html, escapeHtml, colorFromStr, renderPagination, emptyWorkerHtml,
  parseMailItem, extractAddressString, showToast, enhanceSelect, type ProcessedEmail
} from '../utils';
import { openMailDetailModal } from './inbox';

const LIMIT = 20;
let sentPage = 0;
let sentSearch = '';
let sentAddress = '';
let currentSentMails: ProcessedEmail[] = [];
let serverSentTotalPages = 1;
let filteredSentPage = 0;
let currentWorker: WorkerProfile | null = null;

export async function renderSent(settings: AppSettings): Promise<void> {
  const panel = $('#view-sent');
  const worker = getActiveWorker(settings);
  if (!worker) { html(panel, emptyWorkerHtml()); return; }
  currentWorker = worker;

  let rawAddressItems: import('../api').AddressItem[] = [];
  let addresses: string[] = [];
  try {
    const addressData = await fetchAddresses(worker, 0, 100);
    rawAddressItems = addressData.results || [];
    const set = new Set<string>();
    for (const item of rawAddressItems) {
      const addr = extractAddressString(item);
      if (addr) set.add(addr);
    }
    addresses = Array.from(set).sort();
  } catch { /* empty */ }

  const isUserMode = isUser(settings);

  // For User mode, pre-select the first address if sentAddress is empty
  if (isUserMode) {
    if (!sentAddress || !addresses.includes(sentAddress)) {
      sentAddress = addresses[0] || '';
    }
  }

  const optionsHtml = (isUserMode ? '' : `<option value="">${t('inbox.all_addresses') || 'All Addresses'}</option>`) +
    addresses.map(addr => `<option value="${escapeHtml(addr)}" ${addr === sentAddress ? 'selected' : ''}>${escapeHtml(addr)}</option>`).join('');

  html(panel, `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <h2 class="section-title" style="margin:0">${t('sent.title')}</h2>
      <button class="btn btn-ghost btn-sm" id="sent-refresh-btn">
        ${Icons.refresh} ${t('common.refresh') || 'Refresh'}
      </button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
      <select id="sent-address-select" class="form-select" style="flex:1;max-width:48%;font-size:12px;padding:6px 26px 6px 10px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden">
        ${optionsHtml}
      </select>
      <div class="search-bar" style="flex:1;margin-bottom:0">
        ${Icons.search}
        <input type="text" id="sent-search-input" placeholder="${t('inbox.search') || 'Search...'}" value="${escapeHtml(sentSearch)}">
      </div>
    </div>
    <div id="sent-list" class="list-container">
      <div class="loading-state"><div class="spinner"></div></div>
    </div>
    <div id="sent-pagination"></div>
  `);

  panel.querySelector('#sent-refresh-btn')?.addEventListener('click', async () => {
    const btn = $('#sent-refresh-btn') as HTMLButtonElement;
    if (btn) btn.disabled = true;
    showToast('Refreshing sent emails...', 'info');
    await loadSentList(worker, settings, rawAddressItems);
    if (btn) btn.disabled = false;
  });

  const addressSelect = $('#sent-address-select') as HTMLSelectElement;
  enhanceSelect(addressSelect);
  addressSelect.addEventListener('change', () => {
    sentAddress = addressSelect.value;
    sentPage = 0;
    filteredSentPage = 0;
    loadSentList(worker, settings, rawAddressItems);
  });

  const searchInput = $('#sent-search-input') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    sentSearch = searchInput.value;
    filteredSentPage = 0;
    renderFilteredSentList(0);
  });

  await loadSentList(worker, settings, rawAddressItems);
}

export async function loadSentList(
  worker: WorkerProfile,
  settings?: AppSettings,
  rawAddressItems?: import('../api').AddressItem[]
): Promise<void> {
  const listEl = $('#sent-list');

  try {
    // If in User mode and an address is selected, activate its Address JWT
    if (settings && isUser(settings) && sentAddress && rawAddressItems) {
      const match = rawAddressItems.find(item => {
        const addr = extractAddressString(item);
        return addr === sentAddress;
      });
      if (match) {
        try {
          const { fetchAddressDetail } = await import('../api');
          const detail = await fetchAddressDetail(worker, match.id);
          if (detail && detail.jwt) {
            worker.activeAddressJwt = detail.jwt;
          }
        } catch { /* continue */ }
      }
    }

    const data = await fetchSentMails(worker, sentPage, LIMIT, sentAddress);
    const rawItems = data.results || [];
    currentSentMails = rawItems.map(item => parseMailItem(item));
    const total = data.count || 0;
    serverSentTotalPages = Math.ceil(total / LIMIT) || 1;

    renderFilteredSentList(filteredSentPage);
  } catch (err) {
    html(listEl, `<div class="error-state"><p>${escapeHtml(String(err))}</p></div>`);
  }
}

function renderFilteredSentList(pageIdx: number = 0): void {
  const listEl = $('#sent-list');
  const pagEl = $('#sent-pagination');
  if (!listEl) return;

  const query = sentSearch.trim().toLowerCase();
  const filtered = currentSentMails.filter(mail => {
    if (!query) return true;
    return mail.subject.toLowerCase().includes(query) ||
           mail.from.toLowerCase().includes(query) ||
           mail.to.toLowerCase().includes(query) ||
           mail.body.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    html(listEl, `<div class="empty-state"><div class="empty-state-icon">${Icons.sent}</div><p class="empty-state-text">${t('sent.empty')}</p></div>`);
    renderPagination(pagEl, 0, 1, () => {});
    return;
  }

  let displayItems: ProcessedEmail[] = [];
  if (query) {
    const totalFilteredPages = Math.ceil(filtered.length / LIMIT) || 1;
    const curPage = Math.min(pageIdx, totalFilteredPages - 1);
    filteredSentPage = curPage;
    displayItems = filtered.slice(curPage * LIMIT, (curPage + 1) * LIMIT);
    renderPagination(pagEl, curPage, totalFilteredPages, (p) => {
      renderFilteredSentList(p);
    });
  } else {
    displayItems = filtered;
    renderPagination(pagEl, sentPage, serverSentTotalPages, (p) => {
      sentPage = p;
      filteredSentPage = 0;
      if (currentWorker) loadSentList(currentWorker);
    });
  }

  html(listEl, displayItems.map((mail: ProcessedEmail) => {
    const to = mail.to || 'Unknown';
    const subject = mail.subject;
    return `
      <div class="list-item" data-mail-id="${mail.id}">
        <div class="list-item-avatar" style="background:${colorFromStr(to)}">${escapeHtml(to.charAt(0))}</div>
        <div class="list-item-body">
          <div class="list-item-title">${escapeHtml(subject)}</div>
          <div class="list-item-subtitle">${mail.from ? escapeHtml(mail.from) + ' ' : ''}→ ${escapeHtml(to)}</div>
        </div>
        <div class="list-item-meta">
          <span class="list-item-time">${formatDate(mail.created_at)}</span>
        </div>
      </div>
    `;
  }).join(''));

  listEl.querySelectorAll('.list-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      const id = Number(item.getAttribute('data-mail-id'));
      const cached = displayItems.find(m => m.id === id) || currentSentMails.find(m => m.id === id);
      const clickedIdx = displayItems.findIndex(m => m.id === id);

      if (currentWorker) {
        openMailDetailModal(
          currentWorker,
          id,
          cached,
          () => loadSentList(currentWorker!),
          {
            mailList: displayItems,
            currentIndex: clickedIdx >= 0 ? clickedIdx : index,
            currentPage: query ? filteredSentPage : sentPage,
            onPageChange: async (newPage) => {
              if (query) return [];
              sentPage = newPage;
              filteredSentPage = 0;
              const data = await fetchSentMails(currentWorker!, newPage, LIMIT, sentAddress);
              const rawItems = data.results || [];
              currentSentMails = rawItems.map(m => parseMailItem(m));
              serverSentTotalPages = Math.ceil((data.count || 0) / LIMIT) || 1;
              renderFilteredSentList(0);
              return currentSentMails;
            }
          }
        );
      }
    });
  });
}
