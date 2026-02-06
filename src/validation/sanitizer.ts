/**
 * Sanitization functions that promote untrusted input to trusted
 * after Zod schema validation
 */

import { z } from 'zod';
import { TrustedInput, UntrustedInput, InputSource } from '../types.js';
import {
  FileContentSchema,
  FilePathSchema,
  UserCommandSchema,
} from './schemas.js';
import { classifyInput, asUntrusted, asTrusted } from './classifier.js';
import { validationLogger } from '../audit/logger.js';

/**
 * Sanitize untrusted input with schema validation
 * Throws ZodError if validation fails
 */
export function sanitize<T>(
  input: UntrustedInput,
  schema: z.ZodSchema<T>
): T {
  const result = schema.parse(input);
  validationLogger.debug(
    { inputLength: input.length },
    'Input validated successfully'
  );
  return result;
}

/**
 * Safe sanitization with error handling
 * Returns result object instead of throwing
 */
export function safeSanitize<T>(
  input: UntrustedInput,
  schema: z.ZodSchema<T>
):
  | { success: true; data: T }
  | { success: false; error: z.ZodError } {
  const result = schema.safeParse(input);

  if (result.success) {
    validationLogger.debug('Input validated successfully');
  } else {
    validationLogger.warn(
      { issues: result.error.issues },
      'Input validation failed'
    );
  }

  return result;
}

/**
 * THE KEY FUNCTION: Validates and promotes untrusted -> trusted
 * This is the only approved way to create TrustedInput from external sources
 */
export function sanitizeAndTrust(
  input: string,
  source: InputSource,
  schema: z.ZodSchema<string>
): TrustedInput {
  const classified = classifyInput(input, source);
  const untrusted = asUntrusted(classified);

  // Validate with schema
  const validated = sanitize(untrusted, schema);

  // Mark as trusted after validation
  validationLogger.info(
    { source, length: validated.length },
    'Input promoted to trusted after validation'
  );

  return validated as TrustedInput;
}

/**
 * Convenience: Sanitize file content and promote to trusted
 */
export function sanitizeFileContent(content: string): TrustedInput {
  return sanitizeAndTrust(content, InputSource.FILE_CONTENT, FileContentSchema);
}

/**
 * Convenience: Sanitize file path and promote to trusted
 * Logs warning if path contains symlink patterns
 */
export function sanitizeFilePath(path: string): TrustedInput {
  // Check for symlink indicators
  if (path.includes('..') || path.includes('./')) {
    validationLogger.warn(
      { path },
      'File path contains relative components - potential symlink'
    );
  }

  return sanitizeAndTrust(path, InputSource.FILE_CONTENT, FilePathSchema);
}

/**
 * Convenience: Sanitize user command
 */
export function sanitizeUserCommand(command: string): TrustedInput {
  return sanitizeAndTrust(command, InputSource.USER_COMMAND, UserCommandSchema);
}
