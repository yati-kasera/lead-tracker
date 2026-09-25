import { Schema, model, type InferSchemaType } from 'mongoose';
import { DEFAULT_LEAD_STATUS, LEAD_STATUSES } from '../constants/leadStatus.js';

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      required: true,
      default: DEFAULT_LEAD_STATUS,
    },
  },
  { timestamps: true },
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });

export type LeadRecord = InferSchemaType<typeof leadSchema>;

export const Lead = model('Lead', leadSchema);
