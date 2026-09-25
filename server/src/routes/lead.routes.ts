import { Router } from 'express';
import * as leadController from '../controllers/lead.controller.js';

export const leadRouter = Router();

leadRouter.get('/', leadController.listLeads);
leadRouter.post('/', leadController.createLead);
