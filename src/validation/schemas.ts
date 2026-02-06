/**
 * Zod schemas for validating input types at trust boundaries
 */

import { z } from 'zod';

/**
 * User CLI commands - direct user input
 */
export const UserCommandSchema = z.string().min(1).max(10000).trim();

/**
 * File paths - prevent null byte injection
 */
export const FilePathSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((path) => !path.includes('\0'), {
    message: 'Null bytes not allowed in paths',
  });

/**
 * File content - 10MB max
 */
export const FileContentSchema = z.string().max(10_000_000);

/**
 * Network API responses
 */
export const NetworkResponseSchema = z.object({
  status: z.number(),
  body: z.string().max(10_000_000),
});

/**
 * Environment variables - 32KB max
 */
export const EnvironmentVarSchema = z.string().max(32768);
