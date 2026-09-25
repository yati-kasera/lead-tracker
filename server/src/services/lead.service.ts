import type { Types } from 'mongoose';
import type { LeadStatus } from '../constants/leadStatus.js';
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

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 11000;
}

export async function createLead(input: CreateLeadInput): Promise<LeadDto> {
  try {
    const lead = await Lead.create(input);
    return toLeadDto(lead.toObject());
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const message = 'A lead with this email already exists';
      throw new HttpError(409, message, [{ path: 'email', message }]);
    }
    throw err;
  }
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
