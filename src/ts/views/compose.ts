/* =====================================================
   CloudPilot Mail — Compose View
   ===================================================== */

import { t } from '../i18n';
import { Icons } from '../icons';
import { getActiveWorker, isUser, type AppSettings } from '../storage';
import {
  sendMail, fetchAddresses, requestSendMailAccess
} from '../api';
import {
  $, html, escapeHtml, showToast, emptyWorkerHtml, enhanceSelect,
} from '../utils';
import { invalidateStats } from './dashboard';

export async function renderCompose(settings: AppSettings): Promise<void> {
  const panel = $('#view-compose');
  const worker = getActiveWorker(settings);
  if (!worker) { html(panel, emptyWorkerHtml()); return; }

  let addresses: import('../api').AddressItem[] = [];
  try {
    const data = await fetchAddresses(worker, 0, 100);
    addresses = data.results || [];
  } catch { /* empty */ }

  const defaultAddr = addresses.length > 0
    ? (addresses[0].address || addresses[0].name || '')
    : '';

  html(panel, `
    <h2 class="section-title">${t('compose.title')}</h2>
    <div id="compose-warning-banner" class="access-gate-banner mb-3" style="display:none">
      <div class="access-gate-banner-text">
        ${t('compose.no_access')}
      </div>
      <button class="access-gate-banner-action" id="compose-gate-request">
        ${t('compose.request_access')}
      </button>
    </div>
    <div class="card">
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <label class="form-label">${t('compose.from')}</label>
          <span id="compose-balance-indicator" style="font-size:11px;color:var(--cp-text-tertiary);display:none"></span>
        </div>
        <select class="form-select" id="compose-from" style="padding-right:28px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden">
          ${addresses.length === 0 ? `<option value="">${t('compose.select_from')}</option>` : ''}
          ${addresses.map(a => {
            const addr = a.address || a.name || `#${a.id}`;
            return `<option value="${escapeHtml(addr)}" ${addr === defaultAddr ? 'selected' : ''}>${escapeHtml(addr)}</option>`;
          }).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">${t('compose.from_name')}</label>
        <input class="form-input" id="compose-from-name" type="text" placeholder="${t('compose.from_name')}">
      </div>

      <div id="compose-fields-container">
        <div class="form-group">
          <label class="form-label">${t('compose.to')}</label>
          <input class="form-input" id="compose-to" type="email" placeholder="recipient@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">${t('compose.to_name')}</label>
          <input class="form-input" id="compose-to-name" type="text" placeholder="${t('compose.to_name')}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('compose.subject')}</label>
          <input class="form-input" id="compose-subject" type="text" placeholder="${t('compose.subject')}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('compose.body')}</label>
          <textarea class="form-textarea" id="compose-body" rows="5" placeholder="${t('compose.body')}"></textarea>
        </div>
        <button class="btn btn-primary btn-block" id="compose-send">
          ${Icons.send} ${t('compose.send')}
        </button>
      </div>
    </div>
  `);

  const updateSendBalanceState = async (addrStr: string) => {
    const bannerEl = $('#compose-warning-banner');
    const fieldsEl = $('#compose-fields-container');
    const balanceInd = $('#compose-balance-indicator');

    if (!addrStr || !addresses.length) {
      if (isUser(settings)) {
        if (bannerEl) bannerEl.style.display = 'flex';
        if (fieldsEl) fieldsEl.style.display = 'none';
      }
      return;
    }

    const match = addresses.find(a => (a.address || a.name || `#${a.id}`) === addrStr);
    if (!match) return;

    if (isUser(settings)) {
      if (balanceInd) {
        balanceInd.style.display = 'inline-block';
        balanceInd.textContent = 'Checking balance...';
      }
      try {
        const { fetchAddressDetail, fetchUserSettingsUser } = await import('../api');
        // 1. Fetch Address JWT (GET /user_api/bind_address_jwt/:id)
        const detail = await fetchAddressDetail(worker, match.id);
        if (detail && detail.jwt) {
          worker.activeAddressJwt = detail.jwt;
        }
        // 2. Fetch settings (GET /api/settings with Authorization: Bearer <jwt>)
        const userSettings = await fetchUserSettingsUser(worker);
        const balance = userSettings.send_balance ?? 0;

        if (balanceInd) {
          balanceInd.textContent = `Send balance: ${balance}`;
        }

        if (balance > 0) {
          if (bannerEl) bannerEl.style.display = 'none';
          if (fieldsEl) fieldsEl.style.display = 'block';
        } else {
          if (bannerEl) bannerEl.style.display = 'flex';
          if (fieldsEl) fieldsEl.style.display = 'none';
        }
      } catch {
        if (bannerEl) bannerEl.style.display = 'flex';
        if (fieldsEl) fieldsEl.style.display = 'none';
        if (balanceInd) balanceInd.textContent = 'Balance check failed';
      }
    } else {
      // Admin role always has full access
      if (bannerEl) bannerEl.style.display = 'none';
      if (fieldsEl) fieldsEl.style.display = 'block';
    }
  };

  const fromSelect = $('#compose-from') as HTMLSelectElement;
  if (fromSelect) {
    enhanceSelect(fromSelect);
    if (defaultAddr) {
      await updateSendBalanceState(defaultAddr);
    }
  }

  fromSelect?.addEventListener('change', async () => {
    await updateSendBalanceState(fromSelect.value);
  });

  panel.querySelector('#compose-gate-request')?.addEventListener('click', async () => {
    const fromAddr = ($('#compose-from') as HTMLSelectElement)?.value;
    if (!fromAddr) {
      showToast('Select an address first', 'error');
      return;
    }
    try {
      await requestSendMailAccess(worker, fromAddr);
      showToast(t('send_access.request_success') || 'Send access requested successfully!', 'success');
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes('already requested')) {
        showToast(t('send_access.already_requested') || 'Access has already been requested for this address.', 'info');
      } else {
        showToast(msg, 'error');
      }
    }
  });

  panel.querySelector('#compose-send')?.addEventListener('click', async () => {
    const fromAddr = ($('#compose-from') as HTMLSelectElement).value;
    const fromName = ($('#compose-from-name') as HTMLInputElement).value.trim();
    const toAddr = ($('#compose-to') as HTMLInputElement).value.trim();
    const toName = ($('#compose-to-name') as HTMLInputElement).value.trim();
    const subject = ($('#compose-subject') as HTMLInputElement).value.trim();
    const body = ($('#compose-body') as HTMLTextAreaElement).value;

    if (!fromAddr || !toAddr) {
      showToast('From and To are required', 'error');
      return;
    }

    const btn = $('#compose-send') as HTMLButtonElement;
    btn.disabled = true;
    btn.innerHTML = `${Icons.send} ${t('compose.sending')}`;

    try {
      await sendMail(worker, {
        from_name: fromName,
        from_mail: fromAddr,
        to_name: toName,
        to_mail: toAddr,
        subject: subject || '(No subject)',
        content: body,
        is_html: false,
      });
      showToast(t('compose.sent_ok'), 'success');
      ($('#compose-from-name') as HTMLInputElement).value = '';
      ($('#compose-to') as HTMLInputElement).value = '';
      ($('#compose-to-name') as HTMLInputElement).value = '';
      ($('#compose-subject') as HTMLInputElement).value = '';
      ($('#compose-body') as HTMLTextAreaElement).value = '';
      invalidateStats();
      await updateSendBalanceState(fromAddr);
    } catch (err) {
      showToast(String(err), 'error');
    }
    btn.disabled = false;
    btn.innerHTML = `${Icons.send} ${t('compose.send')}`;
  });
}
