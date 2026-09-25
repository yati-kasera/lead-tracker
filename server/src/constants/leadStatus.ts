export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const DEFAULT_LEAD_STATUS: LeadStatus = 'NEW';
