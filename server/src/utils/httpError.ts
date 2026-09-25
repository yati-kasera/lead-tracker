export interface ErrorDetail {
  path: string;
  message: string;
}

export class HttpError extends Error {
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(status: number, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}
