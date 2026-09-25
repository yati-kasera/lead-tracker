import { z } from 'zod';
import { LEAD_STATUSES } from '../constants/leadStatus.js';

const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

export const leadStatusSchema = z.enum(LEAD_STATUSES, {
  error: `Status must be one of: ${LEAD_STATUSES.join(', ')}`,
});

export const createLeadSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .max(254, 'Email is too long')
    .pipe(z.email('Enter a valid email address')),
  phone: z
    .string({ error: 'Phone is required' })
    .trim()
    .regex(PHONE_PATTERN, { message: 'Enter a valid phone number', abort: true })
    .refine((value) => {
      const digits = value.replace(/\D/g, '').length;
      return digits >= 7 && digits <= 15;
    }, 'Phone number must contain 7 to 15 digits'),
  status: leadStatusSchema.optional(),
});

export const updateLeadStatusSchema = z.object({
  status: leadStatusSchema,
});

export const listLeadsQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  status: z.preprocess(emptyToUndefined, leadStatusSchema.optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const leadIdParamSchema = z.object({
  id: z.string().regex(OBJECT_ID_PATTERN, 'Invalid lead id'),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
