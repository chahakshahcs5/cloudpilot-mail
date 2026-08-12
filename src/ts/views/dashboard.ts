/* =====================================================
   CloudPilot Mail — Dashboard View
   ===================================================== */

import { t } from '../i18n';
import { Icons } from '../icons';
import { getActiveWorker, type AppSettings } from '../storage';
import { fetchStats, type AdminStats } from '../api';
import { $, html, escapeHtml } from '../utils';

let cachedStats: AdminStats | null = null;

export function invalidateStats(): void {
  cachedStats = null;
}

export async function renderDashboard(
  settings: AppSettings,
  onNavigateSettings: () => void
): Promise<void> {
  const panel = $('#view-dashboard');
  const worker = getActiveWorker(settings);

  if (!worker) {
    html(panel, `
      <div class="empty-state">
        <div class="empty-state-icon">${Icons.cloud}</div>
        <p class="empty-state-text">${t('settings.no_workers')}</p>
        <button class="btn btn-primary mt-3" id="dash-add-worker">
          ${t('settings.add_worker')}
        </button>
      </div>
    `);
    panel.querySelector('#dash-add-worker')?.addEventListener('click', onNavigateSettings);
    return;
  }

  // Loading state
  html(panel, `
    <div class="flex items-center justify-between mb-3">
      <h2 class="section-title" style="margin:0">${t('stats.title')}</h2>
      <button class="btn btn-ghost btn-sm" id="dash-refresh">
        ${Icons.refresh} ${t('stats.refresh')}
      </button>
    </div>
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${t('stats.loading')}</p>
    </div>
  `);

  panel.querySelector('#dash-refresh')?.addEventListener('click', async () => {
    cachedStats = null;
    await renderDashboard(settings, onNavigateSettings);
  });

  try {
    if (!cachedStats) {
      cachedStats = await fetchStats(worker);
    }
    const s = cachedStats;

    html(panel, `
      <div class="flex items-center justify-between mb-3">
        <h2 class="section-title" style="margin:0">${t('stats.title')}</h2>
        <button class="btn btn-ghost btn-sm" id="dash-refresh2">
          ${Icons.refresh} ${t('stats.refresh')}
        </button>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">${Icons.users}</div>
          <div class="stat-info">
            <div class="stat-value">${s.address_count ?? 0}</div>
            <div class="stat-label">${t('stats.addresses')}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">${Icons.inbox}</div>
          <div class="stat-info">
            <div class="stat-value">${s.mail_count ?? 0}</div>
            <div class="stat-label">${t('stats.received')}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">${Icons.sent}</div>
          <div class="stat-info">
            <div class="stat-value">${s.send_count ?? 0}</div>
            <div class="stat-label">${t('stats.sent')}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon violet">${Icons.users}</div>
          <div class="stat-info">
            <div class="stat-value">${s.user_count ?? 0}</div>
            <div class="stat-label">${t('stats.users') || 'Users'}</div>
          </div>
        </div>
      </div>
    `);

    panel.querySelector('#dash-refresh2')?.addEventListener('click', async () => {
      cachedStats = null;
      await renderDashboard(settings, onNavigateSettings);
    });
  } catch (err: any) {
    const is401 = String(err).includes('401');
    html(panel, `
      <div class="error-state">
        <p>${is401 ? '🔒 Authentication Failed (401)' : t('common.error')}</p>
        <p class="text-xs text-muted">${escapeHtml(is401 ? 'Please verify your Admin Password in Settings.' : String(err))}</p>
        ${is401
          ? `<button class="btn btn-primary mt-3" id="dash-go-settings">${t('settings.title')}</button>`
          : `<button class="btn btn-secondary mt-3" id="dash-retry">${t('common.retry')}</button>`}
      </div>
    `);
    panel.querySelector('#dash-go-settings')?.addEventListener('click', onNavigateSettings);
    panel.querySelector('#dash-retry')?.addEventListener('click', () =>
      renderDashboard(settings, onNavigateSettings));
  }
}
