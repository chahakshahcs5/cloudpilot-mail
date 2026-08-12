/* =====================================================
   CloudPilot Mail — Main Application Orchestrator
   ===================================================== */

import { initI18n, t } from './i18n';
import { loadSettings, saveSettings, isAdmin, isUser, getWorkersForRole, getActiveWorker, type AppSettings } from './storage';
import { Icons } from './icons';
import { $, $$, html, escapeHtml, enhanceSelect } from './utils';

import { renderDashboard, invalidateStats } from './views/dashboard';
import { renderAddresses, invalidateSiteConfig } from './views/addresses';
import { renderInbox, loadInboxList } from './views/inbox';
import { renderSent } from './views/sent';
import { renderSendAccess } from './views/send_access';
import { renderCompose } from './views/compose';
import { renderSettings } from './views/settings';
import { renderRoleSelect, hideRoleSelect } from './views/role_select';

type ViewId = 'dashboard' | 'addresses' | 'inbox' | 'sent' | 'send_access' | 'compose' | 'settings';

interface TabDef {
  id: ViewId;
  labelKey: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'dashboard',   labelKey: 'tab.dashboard',   icon: Icons.dashboard },
  { id: 'addresses',   labelKey: 'tab.addresses',   icon: Icons.users },
  { id: 'inbox',       labelKey: 'tab.inbox',       icon: Icons.inbox },
  { id: 'sent',        labelKey: 'tab.sent',        icon: Icons.sent },
  { id: 'send_access', labelKey: 'tab.send_access', icon: Icons.shield },
  { id: 'compose',     labelKey: 'tab.compose',     icon: Icons.send },
];

let settings: AppSettings;
let currentView: ViewId = 'dashboard';
let autoRefreshTimer: number | null = null;

function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  let resolved = theme;
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolved);

  const btn = $('#btn-theme');
  if (btn) {
    btn.innerHTML = resolved === 'dark' ? Icons.sun : Icons.moon;
    btn.title = resolved === 'dark' ? 'Switch to Light' : 'Switch to Dark';
  }
}

function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  settings.theme = next;
  applyTheme(next);
  saveSettings(settings);
}

function getTabsForRole(): TabDef[] {
  if (isUser(settings)) {
    return TABS.filter(tab => tab.id !== 'dashboard' && tab.id !== 'send_access');
  }
  return TABS;
}

function renderTabs(): void {
  const nav = $('#tab-nav');
  const visibleTabs = getTabsForRole();
  html(nav, visibleTabs.map(tab => `
    <button class="tab-btn ${tab.id === currentView ? 'active' : ''}" data-view="${tab.id}">
      ${tab.icon}
      <span>${t(tab.labelKey)}</span>
    </button>
  `).join(''));

  nav.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.getAttribute('data-view') as ViewId);
    });
  });
}

function renderWorkerSelector(): void {
  const select = $('#worker-select') as HTMLSelectElement;
  const label = $('#worker-label');
  label.textContent = t('worker.label');

  const visibleWorkers = getWorkersForRole(settings);
  const activeWorker = getActiveWorker(settings);

  if (visibleWorkers.length === 0) {
    html(select, `<option value="">${t('worker.none')}</option>`);
    enhanceSelect(select);
    return;
  }

  html(select, visibleWorkers.map(w =>
    `<option value="${w.id}" ${w.id === (activeWorker?.id || '') ? 'selected' : ''}>${escapeHtml(w.name)}</option>`
  ).join(''));

  select.onchange = async () => {
    settings.activeWorkerId = select.value;
    await saveSettings(settings);
    invalidateSiteConfig();
    invalidateStats();
    renderCurrentView();
  };
  
  enhanceSelect(select);
}

function switchView(view: ViewId): void {
  currentView = view;

  const workerBar = $('#worker-bar');
  const tabNav = $('#tab-nav');
  if (view === 'settings') {
    workerBar.classList.add('hidden');
    tabNav.classList.add('hidden');
  } else {
    workerBar.classList.remove('hidden');
    tabNav.classList.remove('hidden');
  }

  $$('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === view);
  });

  $$('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${view}`);
  });

  renderCurrentView();
}

function renderCurrentView(): void {
  switch (currentView) {
    case 'dashboard':   renderDashboard(settings, () => switchView('settings')); break;
    case 'addresses':   renderAddresses(settings); break;
    case 'inbox':       renderInbox(settings); break;
    case 'sent':        renderSent(settings); break;
    case 'send_access': renderSendAccess(settings); break;
    case 'compose':     renderCompose(settings); break;
    case 'settings':  renderSettings({
      onBack: () => switchView(isAdmin(settings) ? 'dashboard' : 'addresses'),
      onWorkerChanged: () => {
        renderWorkerSelector();
        renderTabs();
      },
      onThemeChanged: (th) => applyTheme(th),
      onAutoRefreshChanged: () => setupAutoRefresh(),
      onLanguageChanged: () => {
        const brand = document.querySelector('.header-brand');
        if (brand && settings.role) {
          brand.querySelector('.role-badge')?.remove();
          const badge = document.createElement('span');
          badge.className = `role-badge role-badge--${settings.role}`;
          badge.textContent = settings.role === 'admin' ? t('role.admin') : t('role.user');
          brand.appendChild(badge);
        }
        renderWorkerSelector();
        renderTabs();
        renderCurrentView();
      },
      onRoleChanged: () => {
        // Update role badge
        const brand = document.querySelector('.header-brand');
        if (brand && settings.role) {
          brand.querySelector('.role-badge')?.remove();
          const badge = document.createElement('span');
          badge.className = `role-badge role-badge--${settings.role}`;
          badge.textContent = settings.role === 'admin' ? t('role.admin') : t('role.user');
          brand.appendChild(badge);
        }
        renderTabs();
        switchView(isAdmin(settings) ? 'dashboard' : 'addresses');
      },
      getSettings: () => settings,
      setSettings: (s) => { settings = s; },
    }); break;
  }
}

function setupAutoRefresh(): void {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
  if (settings.autoRefreshInterval > 0) {
    autoRefreshTimer = window.setInterval(() => {
      invalidateStats();
      if (currentView === 'dashboard') {
        renderDashboard(settings, () => switchView('settings'));
      } else if (currentView === 'inbox') {
        renderInbox(settings);
      }
    }, settings.autoRefreshInterval * 1000);
  }
}

async function init(): Promise<void> {
  settings = await loadSettings();
  await initI18n(settings.language);

  applyTheme(settings.theme);

  // First launch — show role selector
  if (!settings.role) {
    // Hide main app UI
    const header = $('#app-header');
    const workerBar = $('#worker-bar');
    const tabNav = $('#tab-nav');
    const contentArea = $('#content-area');
    header.style.display = 'none';
    workerBar.style.display = 'none';
    tabNav.style.display = 'none';
    contentArea.style.display = 'none';

    renderRoleSelect(async (role) => {
      settings.role = role;
      await saveSettings(settings);
      hideRoleSelect();
      header.style.display = '';
      workerBar.style.display = '';
      tabNav.style.display = '';
      contentArea.style.display = '';
      initMainApp();
    });
    return;
  }

  initMainApp();
}

function initMainApp(): void {
  const settingsBtn = $('#btn-settings');
  settingsBtn.innerHTML = Icons.settings;
  settingsBtn.addEventListener('click', () => switchView('settings'));

  const themeBtn = $('#btn-theme');
  themeBtn.addEventListener('click', toggleTheme);

  // Role badge
  const brand = document.querySelector('.header-brand');
  if (brand && settings.role) {
    // Remove existing badge if any
    brand.querySelector('.role-badge')?.remove();
    const badge = document.createElement('span');
    badge.className = `role-badge role-badge--${settings.role}`;
    badge.textContent = settings.role === 'admin' ? t('role.admin') : t('role.user');
    brand.appendChild(badge);
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') applyTheme('system');
  });

  renderWorkerSelector();
  renderTabs();

  if (settings.workers.length === 0) {
    switchView('settings');
  } else {
    switchView(isAdmin(settings) ? 'dashboard' : 'addresses');
  }

  setupAutoRefresh();
}

document.addEventListener('DOMContentLoaded', init);
