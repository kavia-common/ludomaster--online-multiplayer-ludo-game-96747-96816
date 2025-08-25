import { StatusCodes } from 'http-status-codes';

export class ApiError extends Error {
  constructor (statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler (req, res, next) {
  next(new ApiError(StatusCodes.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler (err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const payload = {
    message: err.message || 'Internal Server Error',
    ...(err.details ? { details: err.details } : undefined)
  };
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}
