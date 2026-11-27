import '../utils/zodSetup.js';
import { AppError } from '../utils/errors.js';

/**
 * validate({ body, query, params }) - parses each part with its zod schema.
 * Parsed (and coerced/defaulted) values land on req.valid.{body,query,params}.
 * (We don't overwrite req.query, because it is read-only in Express 5.)
 */
export const validate = (schemas) => (req, res, next) => {
  const valid = {};
  const fields = {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) {
      valid[part] = result.data;
    } else {
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        if (!fields[key]) fields[key] = issue.message;
      }
    }
  }
  if (Object.keys(fields).length) {
    return next(new AppError(400, 'validation_failed', 'Please check the details you entered and try again.', fields));
  }
  req.valid = valid;
  return next();
};
