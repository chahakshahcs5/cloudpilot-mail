/* =====================================================
   CloudPilot Mail — Shared Utilities
   ===================================================== */

import { t } from './i18n';
import { Icons } from './icons';

/* ── DOM helpers ── */
export const $ = <T extends HTMLElement>(sel: string): T =>
  document.querySelector(sel) as T;

export const $$ = (sel: string): NodeListOf<Element> =>
  document.querySelectorAll(sel);

export function html(el: HTMLElement, content: string): void {
  el.innerHTML = content;
}

export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (c) => map[c] || c);
}

export function extractAddressString(a: any): string {
  if (!a) return '';
  if (typeof a === 'string') return a.trim();
  const val = a.address || a.name || a.prefix || '';
  if (typeof val === 'string' && val.trim()) {
    const trimmed = val.trim();
    if (trimmed.includes('@')) return trimmed;
    if (a.domain) return `${trimmed}@${a.domain.trim()}`;
    return trimmed;
  }
  return '';
}

/* ── Toast ── */
export function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
): void {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}

/* ── Clipboard ── */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showToast(t('common.copied'), 'success');
  } catch {
    showToast('Copy failed', 'error');
  }
}

/* ── Custom Scrollable Select Enhancer ── */
let globalSelectListenerAdded = false;

export function enhanceSelect(selectEl: HTMLSelectElement | null): void {
  if (!selectEl) return;

  if (!globalSelectListenerAdded) {
    globalSelectListenerAdded = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-select-dropdown.open').forEach(d => d.classList.remove('open'));
      document.querySelectorAll('.custom-select-trigger.active').forEach(t => t.classList.remove('active'));
    });
  }

  const existingWrapper = selectEl.nextElementSibling as HTMLElement | null;
  if (existingWrapper && existingWrapper.classList.contains('custom-select-container')) {
    if ((selectEl as any)._updateCustomSelect) {
      (selectEl as any)._updateCustomSelect();
    }
    return;
  }

  selectEl.style.display = 'none';

  const container = document.createElement('div');
  container.className = 'custom-select-container';

  selectEl.parentNode?.insertBefore(container, selectEl.nextSibling);

  const update = () => {
    const opts = Array.from(selectEl.options);
    const selectedOpt = selectEl.options[selectEl.selectedIndex] || opts[0];
    const labelText = selectedOpt ? selectedOpt.text : 'Select...';

    container.innerHTML = `
      <button type="button" class="custom-select-trigger">
        <span class="custom-select-label">${escapeHtml(labelText)}</span>
        <svg class="custom-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="custom-select-dropdown">
        ${opts.map((opt, i) => `
          <div class="custom-select-option ${opt.selected ? 'selected' : ''}" data-value="${escapeHtml(opt.value)}" data-index="${i}">
            ${escapeHtml(opt.text)}
          </div>
        `).join('')}
      </div>
    `;

    const trigger = container.querySelector('.custom-select-trigger') as HTMLButtonElement | null;
    const dropdown = container.querySelector('.custom-select-dropdown') as HTMLDivElement | null;
    const optionEls = container.querySelectorAll('.custom-select-option');

    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-dropdown.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      document.querySelectorAll('.custom-select-trigger.active').forEach(t => {
        if (t !== trigger) t.classList.remove('active');
      });

      dropdown?.classList.toggle('open');
      trigger?.classList.toggle('active');
    });

    optionEls.forEach(optEl => {
      optEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(optEl.getAttribute('data-index'));
        selectEl.selectedIndex = idx;
        dropdown?.classList.remove('open');
        trigger?.classList.remove('active');
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        update();
      });
    });
  };

  update();

  const observer = new MutationObserver(() => update());
  observer.observe(selectEl, { childList: true, subtree: true, attributes: true });

  (selectEl as any)._updateCustomSelect = update;
}

/* ── Custom Confirm Dialog ── */
export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function showConfirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const typeColor = options.type === 'danger' ? '#EF4444' : options.type === 'warning' ? '#F59E0B' : '#3B82F6';
    const iconSvg = options.type === 'danger' ? Icons.trash : Icons.cloud;

    const dialogContainer = document.createElement('div');
    dialogContainer.id = 'custom-confirm-container';
    dialogContainer.innerHTML = `
      <style>
        @keyframes cpScaleUp {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      </style>
      <div class="modal-overlay" id="confirm-overlay" style="z-index: 10000; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px);">
        <div class="modal" style="max-width: 320px; width: 90%; text-align: center; padding: 22px 18px; border-radius: 16px; box-shadow: 0 20px 30px rgba(0,0,0,0.25); animation: cpScaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: ${typeColor}18; color: ${typeColor}; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
            ${iconSvg}
          </div>
          <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 6px 0; color: var(--cp-text-primary)">
            ${escapeHtml(options.title || 'Confirm Action')}
          </h3>
          <p style="font-size: 13px; color: var(--cp-text-secondary); margin: 0 0 20px 0; line-height: 1.45;">
            ${escapeHtml(options.message)}
          </p>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" id="confirm-cancel-btn" style="flex: 1; justify-content: center; font-size: 12px;">
              ${escapeHtml(options.cancelText || t('common.cancel') || 'Cancel')}
            </button>
            <button class="btn ${options.type === 'danger' ? 'btn-danger' : 'btn-primary'}" id="confirm-ok-btn" style="flex: 1; justify-content: center; font-size: 12px;">
              ${escapeHtml(options.confirmText || t('common.confirm') || 'Confirm')}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialogContainer);

    const cleanup = (result: boolean) => {
      dialogContainer.remove();
      resolve(result);
    };

    dialogContainer.querySelector('#confirm-cancel-btn')?.addEventListener('click', () => cleanup(false));
    dialogContainer.querySelector('#confirm-ok-btn')?.addEventListener('click', () => cleanup(true));
    dialogContainer.querySelector('#confirm-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'confirm-overlay') cleanup(false);
    });
  });
}

/* ── Color hash for avatars ── */
export function colorFromStr(str: string): string {
  const colors = [
    '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E',
    '#06B6D4', '#EC4899', '#14B8A6', '#6366F1', '#EF4444',
  ];
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return colors[Math.abs(h) % colors.length];
}

/* ── Pagination renderer ── */
export function renderPagination(
  container: HTMLElement,
  currentPage: number,
  totalPages: number,
  onNavigate: (page: number) => void
): void {
  if (totalPages <= 1) {
    html(container, '');
    return;
  }
  html(container, `
    <div class="pagination">
      <button class="btn btn-ghost btn-sm" id="pag-prev"
        ${currentPage <= 0 ? 'disabled' : ''}>${Icons.chevronLeft}</button>
      <span class="pagination-info">
        ${t('common.page', { current: currentPage + 1, total: totalPages })}
      </span>
      <button class="btn btn-ghost btn-sm" id="pag-next"
        ${currentPage >= totalPages - 1 ? 'disabled' : ''}>${Icons.chevronRight}</button>
    </div>
  `);
  container.querySelector('#pag-prev')?.addEventListener('click', () =>
    onNavigate(currentPage - 1));
  container.querySelector('#pag-next')?.addEventListener('click', () =>
    onNavigate(currentPage + 1));
}

/* ── Empty-worker placeholder ── */
export function emptyWorkerHtml(): string {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${Icons.cloud}</div>
      <p class="empty-state-text">${t('settings.no_workers')}</p>
    </div>
  `;
}

/* ── HTML detection ── */
export function isHtml(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

/* ── RFC 2047 MIME Header Decoder ── */
export function decodeMimeHeader(headerStr: string): string {
  if (!headerStr) return '';
  const decoded = headerStr.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, charset, encoding, data) => {
    try {
      const enc = encoding.toUpperCase();
      if (enc === 'B') {
        const bin = atob(data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder(charset || 'utf-8').decode(bytes);
      } else if (enc === 'Q') {
        const unescaped = data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (__: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
        return unescaped;
      }
    } catch {
      return data;
    }
    return data;
  });
  return decoded.trim();
}

/* ── Quoted-Printable Decoder ── */
export function decodeQuotedPrintable(str: string): string {
  if (!str) return '';
  let clean = str.replace(/=\r?\n/g, '');
  try {
    const raw = clean.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return clean;
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Parse MIME body content to extract clean HTML or Plain Text */
export function parseMimeBody(rawStr: string): { body: string; isHtml: boolean } {
  if (!rawStr) return { body: '', isHtml: false };

  if (rawStr.trim().startsWith('{') || rawStr.trim().startsWith('[')) {
    try {
      const json = JSON.parse(rawStr);
      if (json.content) {
        const isHtmlContent = !!json.is_html || (typeof json.content === 'string' && isHtml(json.content));
        return { body: json.content, isHtml: isHtmlContent };
      }
    } catch { /* not JSON */ }
  }

  const headerEnd = rawStr.search(/\r?\n\r?\n/);
  let headerBlock = '';
  let bodyBlock = rawStr;
  if (headerEnd !== -1) {
    headerBlock = rawStr.substring(0, headerEnd);
    bodyBlock = rawStr.substring(headerEnd).trim();
  }

  const boundaryMatch = headerBlock.match(/boundary="?([^";\r\n]+)"?/i) || bodyBlock.match(/boundary="?([^";\r\n]+)"?/i);

  if (boundaryMatch?.[1]) {
    const boundary = boundaryMatch[1].trim();
    const parts = bodyBlock.split(new RegExp(`--${escapeRegExp(boundary)}`));

    let htmlPart = '';
    let textPart = '';

    for (const part of parts) {
      if (part.trim() === '--' || !part.trim()) continue;
      const partHeaderEnd = part.search(/\r?\n\r?\n/);
      let partHeader = '';
      let partBody = part;

      if (partHeaderEnd !== -1) {
        partHeader = part.substring(0, partHeaderEnd);
        partBody = part.substring(partHeaderEnd).trim();
      }

      if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(partHeader)) {
        partBody = decodeQuotedPrintable(partBody);
      } else if (/Content-Transfer-Encoding:\s*base64/i.test(partHeader)) {
        try {
          const cleanB64 = partBody.replace(/\s+/g, '');
          const bin = atob(cleanB64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          partBody = new TextDecoder('utf-8').decode(bytes);
        } catch { /* ignore */ }
      }

      if (/Content-Type:\s*text\/html/i.test(partHeader)) {
        htmlPart = partBody;
      } else if (/Content-Type:\s*text\/plain/i.test(partHeader)) {
        textPart = partBody;
      }
    }

    if (htmlPart) return { body: htmlPart, isHtml: true };
    if (textPart) return { body: textPart, isHtml: isHtml(textPart) };
  }

  let finalBody = bodyBlock;
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headerBlock)) {
    finalBody = decodeQuotedPrintable(finalBody);
  } else if (/Content-Transfer-Encoding:\s*base64/i.test(headerBlock)) {
    try {
      const cleanB64 = finalBody.replace(/\s+/g, '');
      const bin = atob(cleanB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      finalBody = new TextDecoder('utf-8').decode(bytes);
    } catch { /* ignore */ }
  }

  return { body: finalBody, isHtml: isHtml(finalBody) };
}

/* ── Comprehensive Mail Item Parser ── */
export interface ProcessedEmail {
  id: number;
  subject: string;
  from: string;
  to: string;
  body: string;
  isHtml: boolean;
  raw: string;
  created_at: string;
  is_read?: boolean;
}

export function parseMailItem(item: any): ProcessedEmail {
  let subject = item.subject || '';
  let from = item.from || item.source || item.from_mail || item.from_address || item.sender || item.address || '';
  let to = item.to || item.to_mail || item.to_address || item.recipient || '';
  let body = item.content || item.body || '';
  let isHtmlBody = isHtml(body);

  // 1. Check if item.raw is JSON string (Sent emails / cloudflare_temp_email sendbox)
  if (item.raw && typeof item.raw === 'string') {
    const trimmed = item.raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        let json = JSON.parse(trimmed);
        if (typeof json === 'string') json = JSON.parse(json);

        if (json) {
          if (json.subject && !subject) subject = json.subject;

          if (json.to_name || json.to_mail || json.to_address) {
            const mailTo = json.to_name
              ? `${json.to_name} <${json.to_mail || json.to_address}>`
              : (json.to_mail || json.to_address);
            if (mailTo) to = mailTo;
          } else if (json.to) {
            if (typeof json.to === 'string') to = json.to;
            else if (Array.isArray(json.to)) {
              to = json.to.map((t: any) => typeof t === 'string' ? t : (t.email || t.name || '')).join(', ');
            }
          } else if (json.personalizations && Array.isArray(json.personalizations)) {
            const pTos: string[] = [];
            for (const p of json.personalizations) {
              if (p.to && Array.isArray(p.to)) {
                for (const t of p.to) {
                  pTos.push(typeof t === 'string' ? t : (t.email || t.name || ''));
                }
              }
            }
            if (pTos.length > 0) to = pTos.join(', ');
          }

          if (json.from_name || json.from_mail || json.from_address || json.from || json.address || json.sender) {
            const fMail = json.from_mail || json.from_address || json.from || json.address || json.sender;
            const mailFrom = json.from_name ? `${json.from_name} <${fMail}>` : fMail;
            if (mailFrom && typeof mailFrom === 'string') from = mailFrom;
          }

          if (json.content) {
            if (typeof json.content === 'string') {
              body = json.content;
            } else if (Array.isArray(json.content) && json.content.length > 0) {
              const htmlC = json.content.find((c: any) => c.type === 'text/html');
              const textC = json.content.find((c: any) => c.type === 'text/plain');
              if (htmlC?.value) {
                body = htmlC.value;
                isHtmlBody = true;
              } else if (textC?.value) {
                body = textC.value;
              } else if (json.content[0]?.value) {
                body = json.content[0].value;
              }
            }
          }

          if (json.is_html != null) isHtmlBody = !!json.is_html;
        }
      } catch { /* not JSON */ }
    }
  }

  // 2. Check metadata
  if (item.metadata) {
    try {
      const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
      if (meta.subject && !subject) subject = meta.subject;
      if (meta.from && !from) from = meta.from;
      if (meta.to && !to) to = meta.to;
    } catch { /* ignore */ }
  }

  // 3. Parse MIME body if body is still empty or raw is a MIME RFC 822 string
  if (!body || (item.raw && typeof item.raw === 'string' && !item.raw.trim().startsWith('{'))) {
    const { body: parsedBody, isHtml: parsedIsHtml } = parseMimeBody(item.content || item.raw || '');
    if (parsedBody) {
      body = parsedBody;
      isHtmlBody = parsedIsHtml;
    }

    if (item.raw && typeof item.raw === 'string' && !item.raw.trim().startsWith('{')) {
      const rawStr = item.raw;
      const headerEndIndex = rawStr.search(/\r?\n\r?\n/);
      if (headerEndIndex !== -1) {
        const headerBlock = rawStr.substring(0, headerEndIndex);
        const headerLines = headerBlock.split(/\r?\n/);
        let currentHeader = '';
        const headers: Record<string, string> = {};

        for (const line of headerLines) {
          if (/^\s+/.test(line) && currentHeader) {
            headers[currentHeader] += ' ' + line.trim();
          } else {
            const colonIdx = line.indexOf(':');
            if (colonIdx !== -1) {
              currentHeader = line.substring(0, colonIdx).toLowerCase().trim();
              headers[currentHeader] = line.substring(colonIdx + 1).trim();
            }
          }
        }

        if (!subject && headers['subject']) subject = headers['subject'];
        if (!from && headers['from']) from = headers['from'];
        if (!to && headers['to']) to = headers['to'];
      }
    }
  }

  if (!from && (item.address || item.from_mail || item.from_address || item.sender)) {
    from = item.address || item.from_mail || item.from_address || item.sender;
  }

  if (subject) subject = decodeMimeHeader(subject);
  if (from) from = decodeMimeHeader(from);
  if (to) to = decodeMimeHeader(to);

  return {
    id: item.id,
    subject: subject || '(No subject)',
    from: from || 'Unknown',
    to: to || '',
    body: body || '',
    isHtml: isHtmlBody || isHtml(body),
    raw: item.raw || '',
    created_at: item.created_at || '',
    is_read: item.is_read,
  };
}

/** Client-side Random Name / Fake Name generator */
export function generateRandomName(): string {
  const adjectives = [
    'happy', 'bright', 'swift', 'clever', 'calm', 'brave', 'cool', 'eager',
    'gentle', 'jolly', 'kind', 'lively', 'nice', 'proud', 'silly', 'witty',
    'sunny', 'cosmic', 'atomic', 'cyber', 'super', 'hyper', 'mega', 'ultra',
    'mystic', 'shadow', 'silver', 'golden', 'crystal', 'velvet'
  ];
  const nouns = [
    'panda', 'falcon', 'tiger', 'eagle', 'fox', 'wolf', 'bear', 'hawk',
    'otter', 'koala', 'lynx', 'badger', 'dolphin', 'panther', 'raven', 'robin',
    'star', 'comet', 'nova', 'orbit', 'pixel', 'byte', 'spark', 'storm',
    'wave', 'echo', 'shadow', 'breeze', 'cloud', 'river'
  ];

  const firstNames = [
    'alex', 'jordan', 'taylor', 'morgan', 'sam', 'chris', 'pat', 'riley',
    'casey', 'avery', 'reese', 'logan', 'quinn', 'skyler', 'dakota', 'cameron',
    'rowan', 'hayden', 'finley', 'emerson', 'harper', 'kai', 'remy', 'shiloh',
    'river', 'sage', 'charlie', 'parker', 'sawyer', 'ellis', 'eremy', 'jimit',
    'lucas', 'ethan', 'oliver', 'mason', 'liam', 'noah', 'aidan', 'dylan'
  ];

  const useFirstNames = Math.random() > 0.5;
  if (useFirstNames) {
    const name = firstNames[Math.floor(Math.random() * firstNames.length)];
    const num = Math.floor(Math.random() * 900 + 100);
    return `${name}${num}`.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
  } else {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    return `${adj}${noun}${num}`.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
  }
}
