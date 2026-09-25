import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError, type ErrorDetail } from '../utils/httpError.js';

function sendError(res: Response, status: number, message: string, details?: ErrorDetail[]): void {
  res.status(status).json({ error: { message, ...(details ? { details } : {}) } });
}

function isClientHttpError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof err.status === 'number' &&
    err.status >= 400 &&
    err.status < 500 &&
    'expose' in err &&
    err.expose === true
  );
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route ${req.method} ${req.path} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    sendError(res, err.status, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    sendError(res, 400, 'Validation failed', details);
    return;
  }

  // Errors raised by body-parser (malformed JSON, payload too large, ...).
  if (isClientHttpError(err)) {
    sendError(res, err.status, err.message);
    return;
  }

  console.error(err);
  sendError(res, 500, 'Internal server error');
};
