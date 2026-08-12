/* =====================================================
   CloudPilot Mail — API Types
   ===================================================== */

export interface SiteSettings {
  domains: string[];
  defaultDomains: string[];
  domainLabels: string[];
  randomSubdomainDomains: string[];
  enableAddressPassword: boolean;
  enableCreateAddressSubdomainMatch: boolean;
  cfTurnstileSiteKey: string;
  needAuth: boolean;
}

export interface CreateAddressResult {
  jwt: string;
  address: string;
  address_id: number;
  password?: string;
}

export interface MailItem {
  id: number;
  message_id?: string;
  source: string;
  address: string;
  raw?: string;
  subject?: string;
  from?: string;
  is_read?: boolean;
  created_at: string;
}

export interface AddressItem {
  id: number;
  name: string;
  address?: string;
  created_at: string;
  updated_at?: string;
  mail_count?: number;
  send_count?: number;
}

export interface AdminStats {
  address_count: number;
  mail_count: number;
  send_count: number;
  user_count: number;
  unknow_mail_count?: number;
}

export interface SendAccessItem {
  id: number;
  address: string;
  created_at: string;
  balance: number;
  is_enabled: boolean;
}

export interface SendMailPayload {
  from_name?: string;
  from_mail?: string;
  from_address?: string;
  to_name?: string;
  to_mail?: string;
  to_address?: string;
  subject: string;
  content: string;
  is_html?: boolean;
}

export interface PaginatedResult<T> {
  results: T[];
  count: number;
}

export interface TestConnectionResult {
  ok: boolean;
  error?: string;
}
