import { AppError } from '../utils/errors.js';
import { config } from '../config.js';

export const notFoundHandler = (req, res) =>
  res.status(404).json({ error: { code: 'not_found', message: "We couldn't find that page." } });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const send = (status, code, message, extra = {}) =>
    res.status(status).json({ error: { code, message, ...extra, requestId: req.id } });

  if (err instanceof AppError) {
    return send(err.status, err.code, err.message, err.fields ? { fields: err.fields } : {});
  }
  if (err.type === 'entity.parse.failed') return send(400, 'invalid_json', 'We could not read the data you sent.');
  if (err.type === 'entity.too.large') return send(413, 'too_large', 'That is too much data to send at once.');

  // PostgreSQL errors we can explain.
  if (err.code === '23505') return send(409, 'already_exists', 'That already exists.');
  if (err.code === '23503') return send(409, 'related_item_missing', 'Something this depends on no longer exists.');
  if (err.code === '22P02') return send(400, 'invalid_id', 'That ID is not valid.');

  console.error(`[${req.id}] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  return send(
    500,
    'server_error',
    'Something went wrong on our side. Please try again in a moment.',
    config.isProd ? {} : { debug: err.message },
  );
}
