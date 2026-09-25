import type { RequestHandler } from 'express';
import { createLeadSchema, listLeadsQuerySchema } from '../schemas/lead.schema.js';
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
