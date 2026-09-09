export const USER_ROLES = ['BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const LISTING_QUEUES = ['pending', 'approved', 'rejected', 'all'] as const;
export type ListingQueue = (typeof LISTING_QUEUES)[number];

export const LISTING_MODERATION_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const;
export type ListingModerationStatus = (typeof LISTING_MODERATION_STATUSES)[number];

const ROLE_ALIASES: Record<string, UserRole> = {
  buyer: 'BUYER',
  seller: 'SELLER',
  both: 'SELLER',
  manufacturer: 'SELLER',
  distributor: 'SELLER',
  admin: 'ADMIN',
  superadmin: 'SUPER_ADMIN',
  super_admin: 'SUPER_ADMIN',
};

export function normalizeUserRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null;
  return ROLE_ALIASES[value.trim().toLowerCase().replaceAll(' ', '_')] ?? null;
}

export function roleDatabaseValues(role: UserRole): string[] {
  switch (role) {
    case 'BUYER': return ['buyer', 'BUYER'];
    case 'SELLER': return ['seller', 'SELLER', 'both', 'BOTH', 'manufacturer', 'MANUFACTURER', 'distributor', 'DISTRIBUTOR'];
    case 'ADMIN': return ['admin', 'ADMIN'];
    case 'SUPER_ADMIN': return ['super_admin', 'SUPER_ADMIN', 'superadmin', 'SUPERADMIN'];
  }
}

export function listingStatusForQueue(queue: ListingQueue): string | null {
  if (queue === 'all') return null;
  if (queue === 'pending') return 'pending';
  return queue;
}