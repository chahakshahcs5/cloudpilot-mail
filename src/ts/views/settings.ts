/* =====================================================
   CloudPilot Mail — Settings View
   ===================================================== */

import { t, getLanguage, saveLanguage, getSupportedLanguages, type LangCode } from '../i18n';
import { Icons } from '../icons';
import {
  saveSettings, addWorker, updateWorker, removeWorker,
  isAdmin, isUser, getWorkersForRole, getActiveWorker,
  type AppSettings, type WorkerProfile
} from '../storage';
import { testConnection, loginUser } from '../api';
import { $, html, escapeHtml, showToast, showConfirmDialog } from '../utils';
import { invalidateStats } from './dashboard';
import { invalidateSiteConfig } from './addresses';

export interface SettingsCallbacks {
  onBack: () => void;
  onWorkerChanged: () => void;
  onThemeChanged: (theme: 'light' | 'dark' | 'system') => void;
  onAutoRefreshChanged: () => void;
  onLanguageChanged: () => void;
  onRoleChanged: () => void;
  getSettings: () => AppSettings;
  setSettings: (s: AppSettings) => void;
}

export function renderSettings(callbacks: SettingsCallbacks): void {
  const panel = $('#view-settings');
  let settings = callbacks.getSettings();

  const roleWorkers = getWorkersForRole(settings);
  const activeWorker = getActiveWorker(settings);

  const workerCards = roleWorkers.length > 0
    ? roleWorkers.map(w => `
        <div class="worker-card ${w.id === (activeWorker?.id || '') ? 'active-worker' : ''}" data-worker-id="${w.id}">
          <div class="worker-card-icon">${Icons.server}</div>
          <div class="worker-card-body">
            <div class="worker-card-name">${escapeHtml(w.name)}</div>
            <div class="worker-card-url">${escapeHtml(w.url)}</div>
          </div>
          <div class="worker-card-actions">
            <button class="icon-btn worker-edit-btn" data-id="${w.id}" title="Edit">${Icons.edit}</button>
            <button class="icon-btn worker-delete-btn" data-id="${w.id}" title="Delete">${Icons.trash}</button>
          </div>
        </div>
      `).join('')
    : `<div class="empty-state" style="padding:var(--cp-space-6)"><div class="empty-state-icon">${Icons.cloud}</div><p class="empty-state-text">${t('settings.no_workers')}</p></div>`;

  const themes = [
    { id: 'light', icon: Icons.sun, label: t('settings.theme_light') },
    { id: 'dark', icon: Icons.moon, label: t('settings.theme_dark') },
    { id: 'system', icon: Icons.monitor, label: t('settings.theme_system') },
  ];

  const langs = getSupportedLanguages();
  const intervals = [0, 15, 30, 60, 120];

  html(panel, `
    <div class="back-row" id="settings-back">
      ${Icons.arrowLeft}
      <span>${t('inbox.back')}</span>
    </div>

    <div class="settings-section">
      <h2 class="section-title">${t('role.current') || 'Current Role'}</h2>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--cp-space-3) 0">
        <div style="display:flex;align-items:center;gap:var(--cp-space-3)">
          <span class="role-badge role-badge--${settings.role || 'admin'}" style="font-size:11px;padding:4px 10px">
            ${settings.role === 'user' ? t('role.user') : t('role.admin')}
          </span>
          <span style="font-size:var(--cp-text-xs);color:var(--cp-text-secondary)">
            ${settings.role === 'user' ? t('role.user_desc') : t('role.admin_desc')}
          </span>
        </div>
        <button class="btn btn-ghost btn-sm" id="settings-switch-role">
          ${Icons.refresh} ${t('role.switch') || 'Switch'}
        </button>
      </div>
    </div>

    <div class="divider"></div>

    <div class="settings-section">
      <div class="flex items-center justify-between mb-3">
        <h2 class="section-title" style="margin:0">${t('settings.workers')}</h2>
        <button class="btn btn-primary btn-sm" id="settings-add-worker">${Icons.plus} ${t('settings.add_worker')}</button>
      </div>
      <div id="worker-list">
        ${workerCards}
      </div>
    </div>

    <div class="divider"></div>

    <div class="settings-section">
      <h2 class="section-title">${t('settings.appearance')}</h2>
      <label class="form-label">${t('settings.theme')}</label>
      <div class="theme-picker mb-3">
        ${themes.map(th => `
          <button class="theme-option ${settings.theme === th.id ? 'active' : ''}" data-theme="${th.id}">
            ${th.icon}
            <span>${th.label}</span>
          </button>
        `).join('')}
      </div>

      <label class="form-label">${t('settings.language')}</label>
      <div class="lang-picker mb-3">
        ${langs.map(l => `
          <button class="lang-option ${getLanguage() === l.code ? 'active' : ''}" data-lang="${l.code}">
            ${l.label}
          </button>
        `).join('')}
      </div>

      <label class="form-label">${t('settings.refresh_interval')}</label>
      <select class="form-select" id="settings-refresh-interval">
        ${intervals.map(n => `
          <option value="${n}" ${settings.autoRefreshInterval === n ? 'selected' : ''}>
            ${n === 0 ? t('settings.auto_refresh_off') : t('settings.auto_refresh_seconds', { n })}
          </option>
        `).join('')}
      </select>
    </div>
  `);

  panel.querySelector('#settings-back')?.addEventListener('click', callbacks.onBack);

  panel.querySelector('#settings-switch-role')?.addEventListener('click', async () => {
    const newRole = settings.role === 'admin' ? 'user' : 'admin';
    const ok = await showConfirmDialog({
      title: t('role.switch') || 'Switch Role',
      message: newRole === 'admin'
        ? 'Switch to Admin mode? You will need a valid Admin Password configured in your worker profile.'
        : 'Switch to User mode? Dashboard and Sender Access tabs will be hidden.',
      type: 'warning',
      confirmText: t('role.switch') || 'Switch',
    });
    if (!ok) return;
    const current = callbacks.getSettings();
    current.role = newRole;
    callbacks.setSettings(current);
    await saveSettings(current);
    callbacks.onRoleChanged();
  });

  panel.querySelector('#settings-add-worker')?.addEventListener('click', () => openWorkerModal(callbacks));

  panel.querySelectorAll('.worker-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-id')!;
      const w = callbacks.getSettings().workers.find(x => x.id === id);
      if (w) openWorkerModal(callbacks, w);
    });
  });

  panel.querySelectorAll('.worker-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-id')!;
      const ok = await showConfirmDialog({
        title: t('settings.delete') || 'Delete Worker',
        message: 'Are you sure you want to delete this worker profile?',
        type: 'danger',
        confirmText: t('settings.delete') || 'Delete',
      });
      if (!ok) return;
      const updated = removeWorker(callbacks.getSettings(), id);
      callbacks.setSettings(updated);
      await saveSettings(updated);
      invalidateSiteConfig();
      invalidateStats();
      callbacks.onWorkerChanged();
      renderSettings(callbacks);
    });
  });

  panel.querySelectorAll('.worker-card').forEach(card => {
    card.addEventListener('click', async () => {
      const id = card.getAttribute('data-worker-id')!;
      const current = callbacks.getSettings();
      current.activeWorkerId = id;
      callbacks.setSettings(current);
      await saveSettings(current);
      invalidateSiteConfig();
      invalidateStats();
      callbacks.onWorkerChanged();
      renderSettings(callbacks);
    });
  });

  panel.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const th = (btn as HTMLElement).getAttribute('data-theme') as 'light' | 'dark' | 'system';
      const current = callbacks.getSettings();
      current.theme = th;
      callbacks.setSettings(current);
      callbacks.onThemeChanged(th);
      await saveSettings(current);
      renderSettings(callbacks);
    });
  });

  panel.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = (btn as HTMLElement).getAttribute('data-lang') as LangCode;
      await saveLanguage(code);
      const current = callbacks.getSettings();
      current.language = code;
      callbacks.setSettings(current);
      await saveSettings(current);
      callbacks.onLanguageChanged();
    });
  });

  const refreshSelect = $('#settings-refresh-interval') as HTMLSelectElement;
  refreshSelect.addEventListener('change', async () => {
    const current = callbacks.getSettings();
    current.autoRefreshInterval = parseInt(refreshSelect.value, 10);
    callbacks.setSettings(current);
    await saveSettings(current);
    callbacks.onAutoRefreshChanged();
  });
}

function openWorkerModal(callbacks: SettingsCallbacks, existing?: WorkerProfile): void {
  const isEdit = !!existing;
  const isUserMode = isUser(callbacks.getSettings());
  const modalRoot = $('#modal-root');

  const authFieldsHtml = isUserMode ? `
    <div class="form-group">
      <label class="form-label">${t('settings.username') || 'Username / Email'}</label>
      <input class="form-input" id="wm-username" type="text" value="${escapeHtml(existing?.username || '')}" placeholder="user@example.com">
    </div>
    <div class="form-group">
      <label class="form-label">${t('settings.user_password') || 'User Password'}</label>
      <input class="form-input" id="wm-user-pass" type="password" value="${escapeHtml(existing?.userPassword || '')}">
    </div>
  ` : `
    <div class="form-group">
      <label class="form-label">${t('settings.admin_password')}</label>
      <input class="form-input" id="wm-admin-pass" type="password" value="${escapeHtml(existing?.adminPassword || '')}">
    </div>
    <div class="form-group">
      <label class="form-label">${t('settings.site_password')}</label>
      <input class="form-input" id="wm-site-pass" type="password" value="${escapeHtml(existing?.sitePassword || '')}">
    </div>
  `;

  html(modalRoot, `
    <div class="modal-overlay" id="worker-modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? t('settings.edit_worker') : t('settings.add_worker')}</h3>
          <button class="icon-btn" id="worker-modal-close">${Icons.arrowLeft}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">${t('settings.worker_name')}</label>
            <input class="form-input" id="wm-name" type="text" value="${escapeHtml(existing?.name || '')}" placeholder="${t('settings.worker_name_hint')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('settings.worker_url')}</label>
            <input class="form-input" id="wm-url" type="url" value="${escapeHtml(existing?.url || '')}" placeholder="${t('settings.worker_url_hint')}">
          </div>
          ${authFieldsHtml}
          <div class="form-group">
            <label class="form-label">${t('settings.frontend_url')}</label>
            <input class="form-input" id="wm-frontend" type="url" value="${escapeHtml(existing?.frontendUrl || '')}" placeholder="${t('settings.frontend_url_hint')}">
          </div>
          <button class="btn btn-secondary btn-block mb-3" id="wm-test">${Icons.zap} ${t('settings.test_connection')}</button>
          <div id="wm-test-result"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="wm-cancel">${t('common.cancel')}</button>
          <button class="btn btn-primary" id="wm-save">${t('common.save')}</button>
        </div>
      </div>
    </div>
  `);

  const close = () => html(modalRoot, '');
  modalRoot.querySelector('#worker-modal-close')?.addEventListener('click', close);
  modalRoot.querySelector('#wm-cancel')?.addEventListener('click', close);
  modalRoot.querySelector('#worker-modal-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'worker-modal-overlay') close();
  });

  modalRoot.querySelector('#wm-test')?.addEventListener('click', async () => {
    const url = ($('#wm-url') as HTMLInputElement).value.trim();
    const resultEl = $('#wm-test-result');

    if (!url) { showToast('URL is required', 'error'); return; }

    let adminPass = '';
    let sitePass = '';
    let username = '';
    let userPass = '';

    if (isUserMode) {
      username = ($('#wm-username') as HTMLInputElement)?.value.trim() || '';
      userPass = ($('#wm-user-pass') as HTMLInputElement)?.value || '';
    } else {
      adminPass = ($('#wm-admin-pass') as HTMLInputElement)?.value || '';
      sitePass = ($('#wm-site-pass') as HTMLInputElement)?.value || '';
    }

    html(resultEl, `<div class="flex items-center gap-2"><div class="spinner"></div><span class="text-sm">${t('settings.testing')}</span></div>`);

    const tempWorker: WorkerProfile = {
      id: 'test', name: 'test', url,
      adminPassword: adminPass, sitePassword: sitePass,
      username, userPassword: userPass,
      frontendUrl: '', domains: [],
    };

    const res = await testConnection(tempWorker);
    if (res.ok) {
      html(resultEl, `<div class="flex items-center gap-2 text-sm" style="color:var(--cp-emerald-500)">${Icons.check} ${t('settings.test_ok')}</div>`);
    } else {
      html(resultEl, `<div class="flex flex-col gap-1 text-sm" style="color:var(--cp-rose-500)"><span>${t('settings.test_fail')}</span><span class="text-xs text-muted" style="color:var(--cp-rose-400)">${escapeHtml(res.error || '')}</span></div>`);
    }
  });

  modalRoot.querySelector('#wm-save')?.addEventListener('click', async () => {
    const name = ($('#wm-name') as HTMLInputElement).value.trim();
    const url = ($('#wm-url') as HTMLInputElement).value.trim();
    const frontend = ($('#wm-frontend') as HTMLInputElement).value.trim();

    if (!name || !url) {
      showToast('Name and URL are required', 'error');
      return;
    }

    let adminPass = '';
    let sitePass = '';
    let username = '';
    let userPass = '';
    let userToken = existing?.userToken || '';

    if (isUserMode) {
      username = ($('#wm-username') as HTMLInputElement)?.value.trim() || '';
      userPass = ($('#wm-user-pass') as HTMLInputElement)?.value || '';
    } else {
      adminPass = ($('#wm-admin-pass') as HTMLInputElement)?.value || '';
      sitePass = ($('#wm-site-pass') as HTMLInputElement)?.value || '';
    }

    const btn = $('#wm-save') as HTMLButtonElement;
    btn.disabled = true;

    if (isUserMode && username && userPass) {
      try {
        const tempWorker: WorkerProfile = {
          id: existing?.id || 'temp',
          name, url, frontendUrl: frontend, domains: [],
          username, userPassword: userPass,
        };
        userToken = await loginUser(tempWorker);
      } catch (err: any) {
        showToast(`User login failed: ${err.message || String(err)}`, 'error');
        btn.disabled = false;
        return;
      }
    }

    let updated = callbacks.getSettings();
    if (isEdit && existing) {
      updated = updateWorker(updated, existing.id, {
        name, url, adminPassword: adminPass, sitePassword: sitePass,
        username, userPassword: userPass, userToken, frontendUrl: frontend,
      });
    } else {
      updated = addWorker(updated, {
        name, url, adminPassword: adminPass, sitePassword: sitePass,
        username, userPassword: userPass, userToken, frontendUrl: frontend, domains: [],
      });
    }

    callbacks.setSettings(updated);
    await saveSettings(updated);
    invalidateSiteConfig();
    invalidateStats();
    close();
    callbacks.onWorkerChanged();
    renderSettings(callbacks);
    showToast(isEdit ? 'Worker updated' : 'Worker added', 'success');
  });
}
