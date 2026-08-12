/* =====================================================
   CloudPilot Mail — Inbox View
   ===================================================== */

import { t } from '../i18n';
import { Icons } from '../icons';
import { getActiveWorker, type AppSettings, type WorkerProfile } from '../storage';
import {
  fetchMails, fetchMailDetail, deleteMail, fetchAddresses,
  extractVerificationCode, formatDate, type MailItem
} from '../api';
import {
  $, html, escapeHtml, showToast, copyToClipboard,
  colorFromStr, renderPagination, emptyWorkerHtml, parseMailItem,
  extractAddressString, showConfirmDialog, enhanceSelect, type ProcessedEmail
} from '../utils';

const LIMIT = 20;
let inboxPage = 0;
let inboxSearch = '';
let inboxAddress = '';
let currentMails: ProcessedEmail[] = [];
let serverTotalPages = 1;
let filteredPage = 0;
let currentWorker: WorkerProfile | null = null;

export async function renderInbox(settings: AppSettings): Promise<void> {
  const panel = $('#view-inbox');
  const worker = getActiveWorker(settings);
  if (!worker) { html(panel, emptyWorkerHtml()); return; }
  currentWorker = worker;

  let addresses: string[] = [];
  try {
    const addressData = await fetchAddresses(worker, 0, 100);
    const rawAddresses = addressData.results || [];
    const set = new Set<string>();
    for (const item of rawAddresses) {
      const addr = extractAddressString(item);
      if (addr) set.add(addr);
    }
    addresses = Array.from(set).sort();
  } catch { /* empty */ }

  const optionsHtml = `<option value="">${t('inbox.all_addresses') || 'All Addresses'}</option>` +
    addresses.map(addr => `<option value="${escapeHtml(addr)}" ${addr === inboxAddress ? 'selected' : ''}>${escapeHtml(addr)}</option>`).join('');

  html(panel, `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <h2 class="section-title" style="margin:0">${t('inbox.title')}</h2>
      <button class="btn btn-ghost btn-sm" id="inbox-refresh-btn">
        ${Icons.refresh} ${t('common.refresh') || 'Refresh'}
      </button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
      <select id="inbox-address-select" class="form-select" style="flex:1;max-width:48%;font-size:12px;padding:6px 26px 6px 10px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden">
        ${optionsHtml}
      </select>
      <div class="search-bar" style="flex:1;margin-bottom:0">
        ${Icons.search}
        <input type="text" id="inbox-search-input" placeholder="${t('inbox.search')}" value="${escapeHtml(inboxSearch)}">
      </div>
    </div>
    <div id="inbox-list" class="list-container">
      <div class="loading-state"><div class="spinner"></div></div>
    </div>
    <div id="inbox-pagination"></div>
  `);

  panel.querySelector('#inbox-refresh-btn')?.addEventListener('click', async () => {
    const btn = $('#inbox-refresh-btn') as HTMLButtonElement;
    if (btn) btn.disabled = true;
    showToast('Refreshing inbox...', 'info');
    await loadInboxList(worker);
    if (btn) btn.disabled = false;
  });

  const addressSelect = $('#inbox-address-select') as HTMLSelectElement;
  enhanceSelect(addressSelect);
  addressSelect.addEventListener('change', () => {
    inboxAddress = addressSelect.value;
    inboxPage = 0;
    filteredPage = 0;
    loadInboxList(worker);
  });

  const searchInput = $('#inbox-search-input') as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    inboxSearch = searchInput.value;
    filteredPage = 0;
    renderFilteredInboxList(0);
  });

  await loadInboxList(worker);
}

export async function loadInboxList(worker: WorkerProfile): Promise<void> {
  const listEl = $('#inbox-list');

  try {
    const data = await fetchMails(worker, inboxPage, LIMIT, '', inboxAddress);
    const rawItems = data.results || [];
    currentMails = rawItems.map(item => parseMailItem(item));
    const total = data.count || 0;
    serverTotalPages = Math.ceil(total / LIMIT) || 1;

    renderFilteredInboxList(filteredPage);
  } catch (err) {
    html(listEl, `<div class="error-state"><p>${escapeHtml(String(err))}</p></div>`);
  }
}

function renderFilteredInboxList(pageIdx: number = 0): void {
  const listEl = $('#inbox-list');
  const pagEl = $('#inbox-pagination');
  if (!listEl) return;

  const query = inboxSearch.trim().toLowerCase();
  const filtered = currentMails.filter(mail => {
    if (!query) return true;
    return mail.subject.toLowerCase().includes(query) ||
           mail.from.toLowerCase().includes(query) ||
           mail.to.toLowerCase().includes(query) ||
           mail.body.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    html(listEl, `<div class="empty-state"><div class="empty-state-icon">${Icons.inbox}</div><p class="empty-state-text">${t('inbox.empty')}</p></div>`);
    renderPagination(pagEl, 0, 1, () => {});
    return;
  }

  let displayItems: ProcessedEmail[] = [];
  if (query) {
    // Local search active — paginate over filtered list
    const totalFilteredPages = Math.ceil(filtered.length / LIMIT) || 1;
    const curPage = Math.min(pageIdx, totalFilteredPages - 1);
    filteredPage = curPage;
    displayItems = filtered.slice(curPage * LIMIT, (curPage + 1) * LIMIT);
    renderPagination(pagEl, curPage, totalFilteredPages, (p) => {
      renderFilteredInboxList(p);
    });
  } else {
    // Normal server pagination
    displayItems = filtered;
    renderPagination(pagEl, inboxPage, serverTotalPages, (p) => {
      inboxPage = p;
      filteredPage = 0;
      loadInboxList(currentWorker!);
    });
  }

  html(listEl, displayItems.map((mail: ProcessedEmail) => {
    const from = mail.from;
    const subject = mail.subject;
    const initial = from.charAt(0);
    const bg = colorFromStr(from);
    return `
      <div class="list-item" data-mail-id="${mail.id}">
        <div class="list-item-avatar" style="background:${bg}">${escapeHtml(initial)}</div>
        <div class="list-item-body">
          <div class="list-item-title">${escapeHtml(subject)}</div>
          <div class="list-item-subtitle">${escapeHtml(from)} ${mail.to ? `→ ${escapeHtml(mail.to)}` : ''}</div>
        </div>
        <div class="list-item-meta">
          <span class="list-item-time">${formatDate(mail.created_at)}</span>
          ${mail.is_read === false ? '<div class="unread-dot"></div>' : ''}
        </div>
      </div>
    `;
  }).join(''));

  listEl.querySelectorAll('.list-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      const id = Number(item.getAttribute('data-mail-id'));
      const cached = displayItems.find(m => m.id === id) || currentMails.find(m => m.id === id);
      const clickedIdx = displayItems.findIndex(m => m.id === id);

      if (currentWorker) {
        openMailDetailModal(
          currentWorker,
          id,
          cached,
          () => loadInboxList(currentWorker!),
          {
            mailList: displayItems,
            currentIndex: clickedIdx >= 0 ? clickedIdx : index,
            currentPage: query ? filteredPage : inboxPage,
            onPageChange: async (newPage) => {
              if (query) return [];
              inboxPage = newPage;
              filteredPage = 0;
              const res = await fetchMails(currentWorker!, newPage, LIMIT, inboxSearch, inboxAddress);
              currentMails = (res.results || []).map(parseMailItem);
              serverTotalPages = res.totalPages || 1;
              renderFilteredInboxList(0);
              return currentMails;
            }
          }
        );
      }
    });
  });
}

export interface MailNavigationContext {
  mailList: (ProcessedEmail | any)[];
  currentIndex: number;
  currentPage: number;
  onPageChange?: (newPage: number, direction: 'next' | 'prev') => Promise<(ProcessedEmail | any)[]>;
  onDeleteSuccess?: () => void;
}

export async function openMailDetailModal(
  worker: WorkerProfile,
  mailId: number,
  cachedMail?: ProcessedEmail,
  onDeleteSuccess?: () => void,
  navContext?: MailNavigationContext
): Promise<void> {
  const modalRoot = $('#modal-root');

  let currentList = navContext?.mailList || [];
  let currentIndex = navContext?.currentIndex ?? -1;
  let currentPage = navContext?.currentPage ?? 0;

  if (currentIndex === -1 && currentList.length > 0) {
    currentIndex = currentList.findIndex(m => m.id === mailId);
    if (currentIndex === -1) currentIndex = 0;
  }

  const hasNav = navContext && currentList.length > 0;

  html(modalRoot, `
    <div class="modal-overlay" id="mail-detail-overlay">
      <div class="modal">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
            <button class="icon-btn" id="mail-detail-back">${Icons.arrowLeft}</button>
            <h3 class="modal-title truncate" style="max-width:180px">${escapeHtml(cachedMail?.subject || t('common.loading'))}</h3>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            ${hasNav ? `
            <div style="display:flex;align-items:center;gap:2px;background:var(--cp-bg-subtle,#f1f5f9);border-radius:6px;padding:2px 4px">
              <button class="icon-btn" id="mail-nav-prev" title="Previous Email" style="width:24px;height:24px;padding:2px">${Icons.chevronLeft}</button>
              <span id="mail-nav-indicator" style="font-size:11px;font-weight:600;padding:0 4px;color:var(--cp-text-secondary,#64748b)">${currentIndex + 1}/${currentList.length}</span>
              <button class="icon-btn" id="mail-nav-next" title="Next Email" style="width:24px;height:24px;padding:2px">${Icons.chevronRight}</button>
            </div>
            ` : ''}
            <button class="btn btn-ghost btn-sm" id="mail-delete-btn">${Icons.trash}</button>
          </div>
        </div>
        <div class="modal-body" id="mail-detail-content">
          <div class="loading-state"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `);

  let activeKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  const close = () => {
    if (activeKeyHandler) {
      window.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
    html(modalRoot, '');
  };

  modalRoot.querySelector('#mail-detail-back')?.addEventListener('click', close);
  modalRoot.querySelector('#mail-detail-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'mail-detail-overlay') close();
  });

  const updateHeaderNav = () => {
    const navIndicator = modalRoot.querySelector('#mail-nav-indicator');
    const prevBtn = modalRoot.querySelector('#mail-nav-prev') as HTMLButtonElement | null;
    const nextBtn = modalRoot.querySelector('#mail-nav-next') as HTMLButtonElement | null;

    if (!navContext || !currentList.length) return;

    if (navIndicator) {
      navIndicator.textContent = `${currentIndex + 1}/${currentList.length}`;
    }

    if (prevBtn) {
      const isAtStart = (currentPage === 0 && currentIndex === 0);
      prevBtn.disabled = isAtStart;
      prevBtn.style.opacity = isAtStart ? '0.4' : '1';
    }
    if (nextBtn) {
      const isAtEnd = currentIndex === currentList.length - 1;
      const canFetchNext = !!navContext.onPageChange;
      nextBtn.disabled = isAtEnd && !canFetchNext;
      nextBtn.style.opacity = (isAtEnd && !canFetchNext) ? '0.4' : '1';
    }
  };

  const renderMailContent = (mail: ProcessedEmail) => {
    const titleEl = modalRoot.querySelector('.modal-title');
    if (titleEl) titleEl.textContent = mail.subject;

    const code = extractVerificationCode(mail.body);
    const contentEl = $('#mail-detail-content');
    if (!contentEl) return;

    let codeBar = '';
    if (code) {
      codeBar = `
        <div class="verification-code-bar">
          <span style="flex:1">
            <span class="text-xs text-muted">${t('inbox.verification_code')}</span><br>
            <span class="code">${escapeHtml(code)}</span>
          </span>
          <button class="btn btn-primary btn-sm" id="copy-vcode">${Icons.copy} ${t('inbox.copy_code')}</button>
        </div>
      `;
    }

    html(contentEl, `
      <div class="email-detail-header">
        <div class="email-detail-subject">${escapeHtml(mail.subject)}</div>
        <div class="email-detail-meta">
          ${mail.from ? `<span><strong>${t('inbox.from')}:</strong> ${escapeHtml(mail.from)}</span>` : ''}
          ${mail.to ? `<span><strong>${t('inbox.to')}:</strong> ${escapeHtml(mail.to)}</span>` : ''}
          ${mail.created_at ? `<span><strong>${t('inbox.date')}:</strong> ${escapeHtml(mail.created_at)}</span>` : ''}
        </div>
      </div>
      ${codeBar}
      <div class="email-detail-body">
        ${mail.isHtml ? `<iframe id="mail-iframe" sandbox="allow-same-origin" style="min-height:300px"></iframe>` : `<pre style="white-space:pre-wrap;font-family:var(--cp-font-sans);word-break:break-word;overflow-wrap:anywhere">${escapeHtml(mail.body)}</pre>`}
      </div>
    `);

    if (mail.isHtml) {
      const iframe = contentEl.querySelector('#mail-iframe') as HTMLIFrameElement | null;
      if (iframe) {
        const renderDoc = () => {
          const doc = iframe.contentDocument;
          if (doc && mail) {
            doc.open();
            doc.write(`<style>html,body{margin:0;padding:8px;font-family:Inter,sans-serif;font-size:13px;color:#333;word-break:break-word;overflow-wrap:anywhere;}img,table,div{max-width:100% !important;box-sizing:border-box;}</style>${mail.body}`);
            doc.close();
            setTimeout(() => { iframe.style.height = (doc.body.scrollHeight + 20) + 'px'; }, 100);
          }
        };
        iframe.addEventListener('load', renderDoc);
        renderDoc();
      }
    }

    contentEl.querySelector('#copy-vcode')?.addEventListener('click', () => {
      if (code) copyToClipboard(code);
    });
  };

  let currentLoadedMailId = mailId;

  const loadMailAtIndex = async (idx: number) => {
    if (idx < 0 || idx >= currentList.length) return;
    currentIndex = idx;
    const rawMail = currentList[currentIndex];
    currentLoadedMailId = rawMail.id;

    html($('#mail-detail-content'), `<div class="loading-state"><div class="spinner"></div></div>`);
    updateHeaderNav();

    let mObj: ProcessedEmail | null = rawMail.body ? parseMailItem(rawMail) : null;
    if (!mObj) {
      try {
        const fetched = await fetchMailDetail(worker, rawMail.id);
        if (fetched) mObj = parseMailItem(fetched);
      } catch { /* empty */ }
    }
    if (!mObj) mObj = parseMailItem(rawMail);

    renderMailContent(mObj);
    updateHeaderNav();
  };

  const handleNext = async () => {
    if (currentIndex < currentList.length - 1) {
      await loadMailAtIndex(currentIndex + 1);
    } else if (navContext?.onPageChange) {
      const nextBtn = modalRoot.querySelector('#mail-nav-next') as HTMLButtonElement | null;
      if (nextBtn) nextBtn.disabled = true;
      showToast('Loading next page...', 'info');

      try {
        const newMails = await navContext.onPageChange(currentPage + 1, 'next');
        if (newMails && newMails.length > 0) {
          currentPage++;
          currentList = newMails;
          await loadMailAtIndex(0);
        } else {
          showToast('No more emails', 'info');
        }
      } catch (err) {
        showToast(String(err), 'error');
      } finally {
        updateHeaderNav();
      }
    }
  };

  const handlePrev = async () => {
    if (currentIndex > 0) {
      await loadMailAtIndex(currentIndex - 1);
    } else if (currentPage > 0 && navContext?.onPageChange) {
      const prevBtn = modalRoot.querySelector('#mail-nav-prev') as HTMLButtonElement | null;
      if (prevBtn) prevBtn.disabled = true;
      showToast('Loading previous page...', 'info');

      try {
        const newMails = await navContext.onPageChange(currentPage - 1, 'prev');
        if (newMails && newMails.length > 0) {
          currentPage--;
          currentList = newMails;
          await loadMailAtIndex(newMails.length - 1);
        } else {
          showToast('No previous emails', 'info');
        }
      } catch (err) {
        showToast(String(err), 'error');
      } finally {
        updateHeaderNav();
      }
    }
  };

  modalRoot.querySelector('#mail-nav-prev')?.addEventListener('click', handlePrev);
  modalRoot.querySelector('#mail-nav-next')?.addEventListener('click', handleNext);

  modalRoot.querySelector('#mail-delete-btn')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: t('inbox.delete') || 'Delete Email',
      message: 'Are you sure you want to delete this email?',
      type: 'danger',
      confirmText: t('inbox.delete') || 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMail(worker, currentLoadedMailId);
      showToast('Email deleted', 'success');
      if (currentList.length > 1) {
        currentList = currentList.filter(m => m.id !== currentLoadedMailId);
        if (currentIndex >= currentList.length) currentIndex = currentList.length - 1;
        await loadMailAtIndex(currentIndex);
      } else {
        close();
      }
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) { showToast(String(err), 'error'); }
  });

  activeKeyHandler = (e: KeyboardEvent) => {
    if (e.target && ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA')) {
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'j') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'k') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'Escape') {
      close();
    }
  };
  window.addEventListener('keydown', activeKeyHandler);

  // Initial mail load
  let initialMail: ProcessedEmail | null = cachedMail || null;
  if (!initialMail && mailId) {
    try {
      const fetched = await fetchMailDetail(worker, mailId);
      if (fetched) initialMail = parseMailItem(fetched);
    } catch { /* empty */ }
  }
  if (!initialMail && currentList[currentIndex]) {
    initialMail = parseMailItem(currentList[currentIndex]);
  }

  if (initialMail) {
    renderMailContent(initialMail);
    updateHeaderNav();
  } else {
    html($('#mail-detail-content'), `<div class="error-state"><p>Email content not found.</p></div>`);
  }
}
