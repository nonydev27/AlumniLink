/** An error whose message is safe and friendly enough to show to the person using the app. */
export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (message, fields, code = 'bad_request') => new AppError(400, code, message, fields);
export const unauthorized = (message = 'Please log in to continue.', code = 'unauthenticated') => new AppError(401, code, message);
export const forbidden = (message = "You don't have access to this.", code = 'forbidden') => new AppError(403, code, message);
export const notFound = (message = "We couldn't find what you were looking for.") => new AppError(404, 'not_found', message);
export const conflict = (message, code = 'conflict', fields) => new AppError(409, code, message, fields);
