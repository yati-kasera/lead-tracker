import type { RequestHandler } from 'express';
import {
  createLeadSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  updateLeadStatusSchema,
} from '../schemas/lead.schema.js';
import * as leadService from '../services/lead.service.js';

export const createLead: RequestHandler = async (req, res) => {
  const input = createLeadSchema.parse(req.body);
  const lead = await leadService.createLead(input);
  res.status(201).json({ data: lead });
};

export const listLeads: RequestHandler = async (req, res) => {
  const query = listLeadsQuerySchema.parse(req.query);
  const result = await leadService.listLeads(query);
  res.json(result);
};

export const getLeadStats: RequestHandler = async (_req, res) => {
  const stats = await leadService.getLeadStats();
  res.json({ data: stats });
};

export const deleteLead: RequestHandler = async (req, res) => {
  const { id } = leadIdParamSchema.parse(req.params);
  await leadService.deleteLead(id);
  res.status(204).end();
};

export const updateLeadStatus: RequestHandler = async (req, res) => {
  const { id } = leadIdParamSchema.parse(req.params);
  const input = updateLeadStatusSchema.parse(req.body);
  const lead = await leadService.updateLeadStatus(id, input);
  res.json({ data: lead });
};
