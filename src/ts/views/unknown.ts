/* =====================================================
   CloudPilot Mail — Unknown Emails View
   ===================================================== */

import { t } from '../i18n';
import { Icons } from '../icons';
import { getActiveWorker, type AppSettings } from '../storage';
import { fetchUnknownMails, formatDate } from '../api';
import {
  $, html, escapeHtml, colorFromStr, renderPagination, emptyWorkerHtml,
  parseMailItem, type ProcessedEmail
} from '../utils';
import { openMailDetailModal } from './inbox';

const LIMIT = 20;
let unknownPage = 0;
let currentUnknownMails: ProcessedEmail[] = [];

export async function renderUnknown(settings: AppSettings): Promise<void> {
  const panel = $('#view-unknown');
  const worker = getActiveWorker(settings);
  if (!worker) { html(panel, emptyWorkerHtml()); return; }

  html(panel, `
    <h2 class="section-title">${t('unknown.title')}</h2>
    <div id="unknown-list" class="list-container">
      <div class="loading-state"><div class="spinner"></div></div>
    </div>
    <div id="unknown-pagination"></div>
  `);

  try {
    const data = await fetchUnknownMails(worker, unknownPage, LIMIT);
    const rawItems = data.results || [];
    currentUnknownMails = rawItems.map(item => parseMailItem(item));
    const total = data.count || 0;
    const totalPages = Math.ceil(total / LIMIT);
    const listEl = $('#unknown-list');

    if (currentUnknownMails.length === 0) {
      html(listEl, `<div class="empty-state"><div class="empty-state-icon">${Icons.unknown}</div><p class="empty-state-text">${t('unknown.empty')}</p></div>`);
      return;
    }

    html(listEl, currentUnknownMails.map((mail: ProcessedEmail) => {
      const addr = mail.to || mail.from || 'Unknown';
      const subject = mail.subject;
      return `
        <div class="list-item" data-mail-id="${mail.id}">
          <div class="list-item-avatar" style="background:${colorFromStr(addr)}">${escapeHtml(addr.charAt(0))}</div>
          <div class="list-item-body">
            <div class="list-item-title">${escapeHtml(subject)}</div>
            <div class="list-item-subtitle">${escapeHtml(addr)}</div>
          </div>
          <div class="list-item-meta">
            <span class="list-item-time">${formatDate(mail.created_at)}</span>
          </div>
        </div>
      `;
    }).join(''));

    listEl.querySelectorAll('.list-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = Number(item.getAttribute('data-mail-id'));
        const cached = currentUnknownMails.find(m => m.id === id);
        openMailDetailModal(worker, id, cached, () => renderUnknown(settings));
      });
    });

    renderPagination($('#unknown-pagination'), unknownPage, totalPages, (p) => { unknownPage = p; renderUnknown(settings); });
  } catch (err) {
    html($('#unknown-list'), `<div class="error-state"><p>${escapeHtml(String(err))}</p></div>`);
  }
}
