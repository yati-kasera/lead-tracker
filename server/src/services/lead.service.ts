import type { Types } from 'mongoose';
import { LEAD_STATUSES, type LeadStatus } from '../constants/leadStatus.js';
import { Lead, type LeadRecord } from '../models/lead.model.js';
import type { CreateLeadInput, ListLeadsQuery, UpdateLeadStatusInput } from '../schemas/lead.schema.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { HttpError } from '../utils/httpError.js';

export interface LeadDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLeads {
  data: LeadDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
}

type StoredLead = LeadRecord & { _id: Types.ObjectId };

function toLeadDto(lead: StoredLead): LeadDto {
  return {
    id: lead._id.toString(),
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function createLead(input: CreateLeadInput): Promise<LeadDto> {
  const lead = await Lead.create(input);
  return toLeadDto(lead.toObject());
}

export async function listLeads({ search, status, page, limit }: ListLeadsQuery): Promise<PaginatedLeads> {
  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<StoredLead[]>(),
    Lead.countDocuments(filter),
  ]);

  return {
    data: leads.map(toLeadDto),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateLeadStatus(id: string, { status }: UpdateLeadStatusInput): Promise<LeadDto> {
  const lead = await Lead.findByIdAndUpdate(
    id,
    { status },
    { returnDocument: 'after', runValidators: true },
  ).lean<StoredLead>();

  if (!lead) {
    throw new HttpError(404, 'Lead not found');
  }

  return toLeadDto(lead);
}

export async function deleteLead(id: string): Promise<void> {
  const deleted = await Lead.findByIdAndDelete(id);
  if (!deleted) {
    throw new HttpError(404, 'Lead not found');
  }
}

export async function getLeadStats(): Promise<LeadStats> {
  const groups = await Lead.aggregate<{ _id: LeadStatus; count: number }>([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const byStatus = Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0])) as Record<LeadStatus, number>;
  for (const { _id, count } of groups) {
    byStatus[_id] = count;
  }

  return {
    total: groups.reduce((sum, { count }) => sum + count, 0),
    byStatus,
  };
}
