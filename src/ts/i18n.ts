/* =====================================================
   CloudPilot Mail — Internationalization Module
   ===================================================== */

export type LangCode = 'en' | 'zh-CN' | 'zh-TW';

interface TranslationMap {
  [key: string]: string;
}

const translations: Record<LangCode, TranslationMap> = {
  /* ── English (default) ──────────────────────────── */
  en: {
    // Header
    'app.title': 'CloudPilot Mail',
    'app.tagline': 'Cloudflare Temp Email Command Center',

    // Worker selector
    'worker.label': 'Worker',
    'worker.none': 'No workers configured',
    'worker.select': 'Select a worker...',

    // Tab navigation
    'tab.dashboard': 'Dashboard',
    'tab.addresses': 'Addresses',
    'tab.inbox': 'Inbox',
    'tab.sent': 'Sent',
    'tab.send_access': 'Send Access',
    'tab.compose': 'Compose',

    // Role Selection
    'role.select_title': 'Welcome to CloudPilot Mail',
    'role.select_subtitle': 'Choose how you want to use this extension',
    'role.admin': 'Admin',
    'role.user': 'User',
    'role.admin_desc': 'Full server control — manage addresses, users, send access, and view statistics',
    'role.user_desc': 'Access your email inbox, view sent mail, and compose messages',
    'role.current': 'Current Role',
    'role.switch': 'Switch Role',

    // Send Access Control
    'send_access.title': 'Sender Access Control',
    'send_access.add': 'Sender Access',
    'send_access.balance': 'Balance',
    'send_access.is_enabled': 'Is Enabled',
    'send_access.enabled': 'Enabled',
    'send_access.disabled': 'Disabled',
    'send_access.modify': 'Modify',
    'send_access.request': 'Request Access',
    'send_access.request_success': 'Send access requested successfully!',
    'send_access.already_requested': 'Access has already been requested for this address.',
    'send_access.empty': 'No sender access records found',

    // Dashboard / Stats
    'stats.title': 'Overview',
    'stats.addresses': 'Addresses',
    'stats.received': 'Received',
    'stats.sent': 'Sent',
    'stats.unknown': 'Unknown',
    'stats.users': 'Users',
    'stats.refresh': 'Refresh',
    'stats.loading': 'Loading statistics...',

    // Addresses
    'addr.title': 'Email Addresses',
    'addr.search': 'Search addresses...',
    'addr.create': 'Create Address',
    'addr.empty': 'No addresses found',
    'addr.name': 'Name',
    'addr.generate_fake': 'Generate Fake Name',
    'addr.max_limit_reached': 'Maximum address count reached for your account.',
    'addr.domain': 'Domain',
    'addr.subdomain': 'Subdomain prefix',
    'addr.random_subdomain': 'Random subdomain',
    'addr.enable_prefix': 'Enable prefix',
    'addr.creating': 'Creating...',
    'addr.delete': 'Delete Address',
    'addr.delete_confirm': 'Are you sure you want to delete this address?',
    'addr.clear_inbox': 'Clear Inbox',
    'addr.clear_confirm': 'Clear all emails for this address?',
    'addr.clear_sent': 'Clear Sent',
    'addr.clear_sent_confirm': 'Clear sent items for this address?',
    'addr.copy_jwt': 'Copy JWT',
    'addr.copy_login': 'Copy Login Link',
    'addr.credentials': 'Credentials',
    'addr.password': 'Password',
    'addr.count': '{count} emails',

    // Inbox
    'inbox.title': 'Inbox',
    'inbox.search': 'Search emails...',
    'inbox.all_addresses': 'All Addresses',
    'inbox.empty': 'No emails yet',
    'inbox.spam': 'Spam',
    'inbox.inbox': 'Inbox',
    'inbox.from': 'From',
    'inbox.to': 'To',
    'inbox.date': 'Date',
    'inbox.subject': 'Subject',
    'inbox.no_subject': '(No subject)',
    'inbox.back': 'Back to list',
    'inbox.verification_code': 'Verification Code',
    'inbox.copy_code': 'Copy',
    'inbox.delete': 'Delete',

    // Sent
    'sent.title': 'Sent Emails',
    'sent.empty': 'No sent emails',

    // Unknown
    'unknown.title': 'Unknown Addresses',
    'unknown.empty': 'No unknown emails',
    'unknown.create': 'Create Address',
    'unknown.create_hint': 'Create this address to receive future emails',

    // Compose
    'compose.title': 'Compose Email',
    'compose.from': 'From',
    'compose.from_name': 'Sender Name (Optional)',
    'compose.to': 'To',
    'compose.to_name': 'Recipient Name (Optional)',
    'compose.subject': 'Subject',
    'compose.body': 'Message body...',
    'compose.send': 'Send',
    'compose.sending': 'Sending...',
    'compose.sent_ok': 'Email sent successfully!',
    'compose.select_from': 'Select sender identity...',
    'compose.no_access': 'You need to request access to send mail, if have request, please contact admin.',
    'compose.request_access': 'Request Access',

    // Settings
    'settings.title': 'Settings',
    'settings.workers': 'Worker Profiles',
    'settings.add_worker': 'Add Worker',
    'settings.edit_worker': 'Edit Worker',
    'settings.worker_name': 'Name',
    'settings.worker_name_hint': 'e.g. "My Mail Server"',
    'settings.worker_url': 'Worker URL',
    'settings.worker_url_hint': 'e.g. https://mail.example.com',
    'settings.admin_password': 'Admin Password',
    'settings.site_password': 'Site Password (optional)',
    'settings.username': 'Username / Email',
    'settings.user_password': 'User Password',
    'settings.frontend_url': 'Frontend URL (optional)',
    'settings.frontend_url_hint': 'For generating login links',
    'settings.test_connection': 'Test Connection',
    'settings.testing': 'Testing...',
    'settings.test_ok': 'Connection successful!',
    'settings.test_fail': 'Connection failed',
    'settings.save': 'Save',
    'settings.cancel': 'Cancel',
    'settings.delete': 'Delete',
    'settings.appearance': 'Appearance',
    'settings.theme': 'Theme',
    'settings.theme_light': 'Light',
    'settings.theme_dark': 'Dark',
    'settings.theme_system': 'System',
    'settings.language': 'Language',
    'settings.auto_refresh': 'Auto Refresh',
    'settings.auto_refresh_off': 'Off',
    'settings.auto_refresh_seconds': '{n}s',
    'settings.default_worker': 'Default Worker',
    'settings.no_workers': 'No workers added yet. Add one to get started!',
    'settings.refresh_interval': 'Refresh Interval',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.page': 'Page {current} of {total}',
    'common.prev': 'Previous',
    'common.next': 'Next',
    'common.refresh': 'Refresh',
  },

  /* ── Simplified Chinese ──────────────────────────── */
  'zh-CN': {
    'app.title': 'CloudPilot Mail',
    'app.tagline': 'Cloudflare 临时邮箱管理中心',

    'worker.label': '服务',
    'worker.none': '尚未配置 Worker',
    'worker.select': '选择一个 Worker...',

    'tab.dashboard': '总览',
    'tab.addresses': '地址',
    'tab.inbox': '收件',
    'tab.sent': '发件',
    'tab.send_access': '发件权限',
    'tab.compose': '发送',

    // Role Selection
    'role.select_title': '欢迎使用 CloudPilot Mail',
    'role.select_subtitle': '选择您的使用方式',
    'role.admin': '管理员',
    'role.user': '用户',
    'role.admin_desc': '完整的服务器管理 — 管理地址、用户、发件权限和查看统计数据',
    'role.user_desc': '访问邮箱收件箱、查看已发送邮件和撰写邮件',
    'role.current': '当前角色',
    'role.switch': '切换角色',

    // Send Access Control
    'send_access.title': '发件权限管理',
    'send_access.add': '添加发件权限',
    'send_access.balance': '发件额度',
    'send_access.is_enabled': '是否启用',
    'send_access.enabled': '已启用',
    'send_access.disabled': '已禁用',
    'send_access.modify': '修改权限',
    'send_access.request': '申请发件权限',
    'send_access.request_success': '已成功申请发件权限！',
    'send_access.empty': '暂无发件权限记录',

    'stats.title': '数据总览',
    'stats.addresses': '邮箱地址',
    'stats.received': '收件数',
    'stats.sent': '发件数',
    'stats.unknown': '未知收件',
    'stats.users': '用户数',
    'stats.refresh': '刷新',
    'stats.loading': '正在加载统计数据...',

    'addr.title': '邮箱地址',
    'addr.search': '搜索地址...',
    'addr.create': '创建地址',
    'addr.empty': '暂无邮箱地址',
    'addr.name': '名称',
    'addr.generate_fake': '生成随机名称',
    'addr.max_limit_reached': '已达到最大创建地址数量限制。',
    'addr.domain': '域名',
    'addr.subdomain': '子域名前缀',
    'addr.random_subdomain': '随机子域名',
    'addr.enable_prefix': '启用前缀',
    'addr.creating': '创建中...',
    'addr.delete': '删除地址',
    'addr.delete_confirm': '确定要删除此地址吗？',
    'addr.clear_inbox': '清空收件箱',
    'addr.clear_confirm': '确定要清空此地址的所有邮件吗？',
    'addr.clear_sent': '清空已发送',
    'addr.clear_sent_confirm': '确定要清空此地址的已发送邮件吗？',
    'addr.copy_jwt': '复制 JWT',
    'addr.copy_login': '复制登录链接',
    'addr.credentials': '凭证信息',
    'addr.password': '密码',
    'addr.count': '{count} 封邮件',

    'inbox.title': '收件箱',
    'inbox.search': '搜索邮件...',
    'inbox.all_addresses': '所有邮箱地址',
    'inbox.empty': '暂无邮件',
    'inbox.spam': '垃圾邮件',
    'inbox.inbox': '收件箱',
    'inbox.from': '发件人',
    'inbox.to': '收件人',
    'inbox.date': '日期',
    'inbox.subject': '主题',
    'inbox.no_subject': '（无主题）',
    'inbox.back': '返回列表',
    'inbox.verification_code': '验证码',
    'inbox.copy_code': '复制',
    'inbox.delete': '删除',

    'sent.title': '已发送邮件',
    'sent.empty': '暂无发件记录',

    'unknown.title': '未知地址邮件',
    'unknown.empty': '暂无未知地址邮件',
    'unknown.create': '创建地址',
    'unknown.create_hint': '创建此地址以接收后续邮件',

    'compose.title': '撰写邮件',
    'compose.from': '发件人',
    'compose.from_name': '发件人姓名（可选）',
    'compose.to': '收件人',
    'compose.to_name': '收件人姓名（可选）',
    'compose.subject': '主题',
    'compose.body': '邮件正文...',
    'compose.send': '发送',
    'compose.sending': '发送中...',
    'compose.sent_ok': '邮件发送成功！',
    'compose.select_from': '选择发件身份...',
    'compose.no_access': '您需要申请发件权限，如已申请，请联系管理员。',
    'compose.request_access': '申请权限',

    'settings.title': '设置',
    'settings.workers': 'Worker 配置',
    'settings.add_worker': '添加 Worker',
    'settings.edit_worker': '编辑 Worker',
    'settings.worker_name': '名称',
    'settings.worker_name_hint': '例如 "我的邮件服务器"',
    'settings.worker_url': 'Worker 地址',
    'settings.worker_url_hint': '例如 https://mail.example.com',
    'settings.admin_password': '管理员密码',
    'settings.site_password': '站点密码（可选）',
    'settings.username': '用户名 / 邮箱',
    'settings.user_password': '用户密码',
    'settings.frontend_url': '前端地址（可选）',
    'settings.frontend_url_hint': '用于生成登录链接',
    'settings.test_connection': '测试连接',
    'settings.testing': '测试中...',
    'settings.test_ok': '连接成功！',
    'settings.test_fail': '连接失败',
    'settings.save': '保存',
    'settings.cancel': '取消',
    'settings.delete': '删除',
    'settings.appearance': '外观',
    'settings.theme': '主题',
    'settings.theme_light': '浅色',
    'settings.theme_dark': '深色',
    'settings.theme_system': '跟随系统',
    'settings.language': '语言',
    'settings.auto_refresh': '自动刷新',
    'settings.auto_refresh_off': '关闭',
    'settings.auto_refresh_seconds': '{n}秒',
    'settings.default_worker': '默认 Worker',
    'settings.no_workers': '尚未添加 Worker，请先添加一个！',
    'settings.refresh_interval': '刷新间隔',

    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.confirm': '确认',
    'common.close': '关闭',
    'common.copy': '复制',
    'common.copied': '已复制！',
    'common.loading': '加载中...',
    'common.error': '发生错误',
    'common.retry': '重试',
    'common.page': '第 {current} / {total} 页',
    'common.prev': '上一页',
    'common.next': '下一页',
    'common.refresh': '刷新',
  },

  /* ── Traditional Chinese ──────────────────────────── */
  'zh-TW': {
    'app.title': 'CloudPilot Mail',
    'app.tagline': 'Cloudflare 臨時郵箱管理中心',

    'worker.label': '服務',
    'worker.none': '尚未配置 Worker',
    'worker.select': '選擇一個 Worker...',

    'tab.dashboard': '總覽',
    'tab.addresses': '地址',
    'tab.inbox': '收件',
    'tab.sent': '發件',
    'tab.send_access': '發件權限',
    'tab.compose': '發送',

    // Role Selection
    'role.select_title': '歡迎使用 CloudPilot Mail',
    'role.select_subtitle': '選擇您的使用方式',
    'role.admin': '管理員',
    'role.user': '使用者',
    'role.admin_desc': '完整的伺服器管理 — 管理地址、使用者、發件權限和檢視統計數據',
    'role.user_desc': '存取郵箱收件匣、檢視已發送郵件和撰寫郵件',
    'role.current': '當前角色',
    'role.switch': '切換角色',

    // Send Access Control
    'send_access.title': '發件權限管理',
    'send_access.add': '添加發件權限',
    'send_access.balance': '發件額度',
    'send_access.is_enabled': '是否啟用',
    'send_access.enabled': '已啟用',
    'send_access.disabled': '已禁用',
    'send_access.modify': '修改權限',
    'send_access.request': '申請發件權限',
    'send_access.request_success': '已成功申請發件權限！',
    'send_access.empty': '暫無發件權限記錄',

    'stats.title': '數據總覽',
    'stats.addresses': '郵箱地址',
    'stats.received': '收件數',
    'stats.sent': '發件數',
    'stats.unknown': '未知收件',
    'stats.refresh': '刷新',
    'stats.loading': '正在載入統計數據...',

    'addr.title': '郵箱地址',
    'addr.search': '搜尋地址...',
    'addr.create': '建立地址',
    'addr.empty': '暫無郵箱地址',
    'addr.name': '名稱',
    'addr.generate_fake': '生成隨機名稱',
    'addr.max_limit_reached': '已達到最大建立地址數量限制。',
    'addr.domain': '域名',
    'addr.subdomain': '子域名前綴',
    'addr.random_subdomain': '隨機子域名',
    'addr.enable_prefix': '啟用前綴',
    'addr.creating': '建立中...',
    'addr.delete': '刪除地址',
    'addr.delete_confirm': '確定要刪除此地址嗎？',
    'addr.clear_inbox': '清空收件箱',
    'addr.clear_confirm': '確定要清空此地址的所有郵件嗎？',
    'addr.clear_sent': '清空已發送',
    'addr.clear_sent_confirm': '確定要清空此地址的已發送郵件嗎？',
    'addr.copy_jwt': '複製 JWT',
    'addr.copy_login': '複製登入連結',
    'addr.credentials': '憑證資訊',
    'addr.password': '密碼',
    'addr.count': '{count} 封郵件',

    'inbox.title': '收件箱',
    'inbox.search': '搜尋郵件...',
    'inbox.empty': '暫無郵件',
    'inbox.spam': '垃圾郵件',
    'inbox.inbox': '收件箱',
    'inbox.from': '寄件人',
    'inbox.to': '收件人',
    'inbox.date': '日期',
    'inbox.subject': '主題',
    'inbox.no_subject': '（無主題）',
    'inbox.back': '返回列表',
    'inbox.verification_code': '驗證碼',
    'inbox.copy_code': '複製',
    'inbox.delete': '刪除',

    'sent.title': '已發送郵件',
    'sent.empty': '暫無發件記錄',

    'unknown.title': '未知地址郵件',
    'unknown.empty': '暫無未知地址郵件',
    'unknown.create': '建立地址',
    'unknown.create_hint': '建立此地址以接收後續郵件',

    'compose.title': '撰寫郵件',
    'compose.from': '寄件人',
    'compose.from_name': '寄件人姓名（選填）',
    'compose.to': '收件人',
    'compose.to_name': '收件人姓名（選填）',
    'compose.subject': '主題',
    'compose.body': '郵件正文...',
    'compose.send': '發送',
    'compose.sending': '發送中...',
    'compose.sent_ok': '郵件發送成功！',
    'compose.select_from': '選擇寄件身份...',
    'compose.no_access': '您需要申請發件權限，如已申請，請聯絡管理員。',
    'compose.request_access': '申請權限',

    'settings.title': '設定',
    'settings.workers': 'Worker 配置',
    'settings.add_worker': '新增 Worker',
    'settings.edit_worker': '編輯 Worker',
    'settings.worker_name': '名稱',
    'settings.worker_name_hint': '例如 "我的郵件伺服器"',
    'settings.worker_url': 'Worker 地址',
    'settings.worker_url_hint': '例如 https://mail.example.com',
    'settings.admin_password': '管理員密碼',
    'settings.site_password': '站點密碼（可選）',
    'settings.username': '使用者名稱 / 郵箱',
    'settings.user_password': '使用者密碼',
    'settings.frontend_url': '前端地址（可選）',
    'settings.frontend_url_hint': '用於產生登入連結',
    'settings.test_connection': '測試連線',
    'settings.testing': '測試中...',
    'settings.test_ok': '連線成功！',
    'settings.test_fail': '連線失敗',
    'settings.save': '儲存',
    'settings.cancel': '取消',
    'settings.delete': '刪除',
    'settings.appearance': '外觀',
    'settings.theme': '主題',
    'settings.theme_light': '淺色',
    'settings.theme_dark': '深色',
    'settings.theme_system': '跟隨系統',
    'settings.language': '語言',
    'settings.auto_refresh': '自動刷新',
    'settings.auto_refresh_off': '關閉',
    'settings.auto_refresh_seconds': '{n}秒',
    'settings.default_worker': '預設 Worker',
    'settings.no_workers': '尚未新增 Worker，請先新增一個！',
    'settings.refresh_interval': '刷新間隔',

    'common.save': '儲存',
    'common.cancel': '取消',
    'common.delete': '刪除',
    'common.confirm': '確認',
    'common.close': '關閉',
    'common.copy': '複製',
    'common.copied': '已複製！',
    'common.loading': '載入中...',
    'common.error': '發生錯誤',
    'common.retry': '重試',
    'common.page': '第 {current} / {total} 頁',
    'common.prev': '上一頁',
    'common.next': '下一頁',
  },
};

let currentLang: LangCode = 'en';

/** Detect browser language and return best match */
function detectLanguage(): LangCode {
  const nav = navigator.language || (navigator as any).userLanguage || 'en';
  const lang = nav.toLowerCase();
  if (lang.startsWith('zh-tw') || lang.startsWith('zh-hant')) return 'zh-TW';
  if (lang.startsWith('zh')) return 'zh-CN';
  return 'en';
}

/** Set the active language */
export function setLanguage(lang: LangCode): void {
  currentLang = lang;
  document.documentElement.setAttribute('lang', lang);
}

/** Get the active language */
export function getLanguage(): LangCode {
  return currentLang;
}

/**
 * Translate a key, with optional interpolation.
 * @example t('addr.count', { count: 42 }) → "42 emails"
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = translations[currentLang]?.[key] ?? translations.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

/** Initialise i18n: detect or load saved language */
export async function initI18n(preferredLang?: string): Promise<void> {
  if (preferredLang && translations[preferredLang as LangCode]) {
    setLanguage(preferredLang as LangCode);
    return;
  }
  try {
    const stored = await chrome.storage.local.get('cp_language');
    if (stored.cp_language && translations[stored.cp_language as LangCode]) {
      setLanguage(stored.cp_language as LangCode);
    } else {
      setLanguage(detectLanguage());
    }
  } catch {
    setLanguage(detectLanguage());
  }
}

/** Persist selected language */
export async function saveLanguage(lang: LangCode): Promise<void> {
  setLanguage(lang);
  await chrome.storage.local.set({ cp_language: lang });
}

/** Get all supported languages for the picker */
export function getSupportedLanguages(): Array<{ code: LangCode; label: string }> {
  return [
    { code: 'en', label: 'English' },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'zh-TW', label: '繁體中文' },
  ];
}
