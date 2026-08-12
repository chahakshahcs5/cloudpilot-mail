/* =====================================================
   CloudPilot Mail — Role Selection View
   ===================================================== */

import { t } from '../i18n';
import { Icons } from '../icons';
import { $ , html } from '../utils';

export function renderRoleSelect(
  onRoleSelected: (role: 'admin' | 'user') => void
): void {
  const screen = $('#role-select-screen');
  screen.style.display = 'flex';

  html(screen, `
    <svg class="role-select-logo" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="rs-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3B82F6"/>
          <stop offset="100%" stop-color="#8B5CF6"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#rs-logo-grad)"/>
      <rect x="6.5" y="10" width="19" height="12" rx="2" fill="white" opacity="0.95"/>
      <path d="M6.5 12l9.5 5.5 9.5-5.5" stroke="url(#rs-logo-grad)" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h1 class="role-select-title">${t('role.select_title')}</h1>
    <p class="role-select-subtitle">${t('role.select_subtitle')}</p>
    <div class="role-cards">
      <div class="role-card role-card--admin" id="role-pick-admin">
        <div class="role-card-icon">${Icons.shield}</div>
        <div class="role-card-content">
          <div class="role-card-title">${t('role.admin')}</div>
          <p class="role-card-desc">${t('role.admin_desc')}</p>
        </div>
        <div class="role-card-arrow">${Icons.chevronRight}</div>
      </div>
      <div class="role-card role-card--user" id="role-pick-user">
        <div class="role-card-icon">${Icons.inbox}</div>
        <div class="role-card-content">
          <div class="role-card-title">${t('role.user')}</div>
          <p class="role-card-desc">${t('role.user_desc')}</p>
        </div>
        <div class="role-card-arrow">${Icons.chevronRight}</div>
      </div>
    </div>
  `);

  screen.querySelector('#role-pick-admin')?.addEventListener('click', () => {
    onRoleSelected('admin');
  });

  screen.querySelector('#role-pick-user')?.addEventListener('click', () => {
    onRoleSelected('user');
  });
}

export function hideRoleSelect(): void {
  const screen = $('#role-select-screen');
  if (screen) {
    screen.style.display = 'none';
    html(screen, '');
  }
}
