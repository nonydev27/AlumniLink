import { z } from 'zod';
import './zodSetup.js';

export const idParam = z.object({ id: z.string().uuid('That ID is not valid.') });
export const userIdParam = z.object({ userId: z.string().uuid('That ID is not valid.') });

export const pagingShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};
export const pagingQuery = z.object(pagingShape);

/** Query-string booleans: z.coerce.boolean() would turn "false" into true, so be explicit. */
export const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .url('Please enter a full web address, like https://example.com.')
  .refine((u) => /^https?:\/\//i.test(u), 'Web addresses must start with http:// or https://');
