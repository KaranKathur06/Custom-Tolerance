/**
 * Metal Hub — Route Constants
 *
 * Centralized route definitions for consistent navigation
 * across components, middleware, and API routes.
 */

// ── Public Routes ──
export const PUBLIC_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  MARKETPLACE: '/marketplace',
  PRODUCTS: '/products',
  ABOUT: '/about',
  CONTACT: '/contact',
  BLOG: '/blog',
  PRIVACY: '/privacy',
  TERMS: '/terms',
} as const;

// ── Auth Routes ──
export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
} as const;

// ── Dashboard Routes ──
export const DASHBOARD_ROUTES = {
  MAIN: '/dashboard',
  SELLER: '/seller',
  BUYER: '/buyer',
} as const;

// ── Admin Routes ──
export const ADMIN_ROUTES = {
  ROOT: '/ops/admin',
  VERIFY: '/admin/verify',
  USERS: '/ops/admin/users',
  SELLERS: '/ops/admin/users?role=seller',
  LISTINGS: '/ops/admin/listings',
  RFQS: '/ops/crm/pipeline',
  BANNERS: '/api/admin/banners',
  CAPABILITIES: '/api/admin/capabilities',
  ANALYTICS: '/api/admin/analytics',
  REVENUE: '/ops/admin/finance',
  MEDIA: '/ops/admin/cms',
  LOGS: '/ops/admin/audit',
  NOTIFICATIONS: '/notifications',
  CMS: '/ops/admin/cms',
  SETTINGS: '/ops/admin/settings',
  SECURITY: '/ops/admin/security',
} as const;

// ── Ops Routes ──
export const OPS_ROUTES = {
  ROOT: '/ops',
  ADMIN_MODE: '/ops/admin',
  CRM_MODE: '/ops/crm',
  CRM_PIPELINE: '/ops/crm/pipeline',
  CRM_LEADS: '/ops/crm/leads',
  CRM_DEALS: '/ops/crm/deals',
  CRM_ANALYTICS: '/ops/crm/analytics',
} as const;

// ── Settings Routes ──
export const SETTINGS_ROUTES = {
  PROFILE: '/settings?tab=profile',
  SECURITY: '/settings?tab=security',
  NOTIFICATIONS: '/settings?tab=notifications',
  PRIVACY: '/settings?tab=privacy',
  BILLING: '/settings?tab=billing',
} as const;

// ── Seller Settings Routes ──
export const SELLER_SETTINGS_ROUTES = {
  STORE: '/seller/settings/store',
  PRODUCTS: '/seller/settings/products',
  TEAM: '/seller/settings/team',
} as const;

// ── API Routes ──
export const API_ROUTES = {
  // Auth
  AUTH_SESSION: '/api/auth/session',
  AUTH_PROFILE: '/api/auth/profile',

  // OTP
  OTP_SEND: '/api/otp/send',
  OTP_VERIFY: '/api/otp/verify',

  // Email verification (signup OTP)
  VERIFY_EMAIL_SEND: '/api/auth/verify-email/send',
  VERIFY_EMAIL_RESEND: '/api/auth/verify-email/resend',
  VERIFY_EMAIL_VERIFY: '/api/auth/verify-email/verify',

  // Products
  PRODUCTS: '/api/products',
  PRODUCT_DETAIL: (slug: string) => `/api/products/${slug}`,

  // Uploads
  UPLOADS: '/api/uploads',
  UPLOAD_DETAIL: (id: string) => `/api/uploads/${id}`,

  // Settings
  SETTINGS_USER: '/api/settings/user',
  SETTINGS_PLATFORM: '/api/settings/platform',
  SETTINGS_COMPANY: (id: string) => `/api/settings/company/${id}`,

  // Admin
  ADMIN_DASHBOARD: '/api/admin/dashboard',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_LOGS: '/api/admin/logs',

  // CRM
  CRM_LEADS: '/api/crm/leads',
  CRM_LEAD_DETAIL: (id: string) => `/api/crm/leads/${id}`,
  CRM_PIPELINE: '/api/crm/pipeline',

  // Notifications
  NOTIFICATIONS: '/api/notifications',
} as const;
