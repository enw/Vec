/**
 * Input validation and classification tests
 */

import { describe, it, expect } from 'vitest';
import { classifyInput } from '../src/validation/classifier.js';
import { sanitize, sanitizeAndTrust } from '../src/validation/sanitizer.js';
import { UserCommandSchema, FilePathSchema } from '../src/validation/schemas.js';
import { InputSource } from '../src/types.js';
import { ZodError } from 'zod';

describe('Input Classification', () => {
  it('classifies USER_COMMAND as trusted', () => {
    const classified = classifyInput('ls -la', InputSource.USER_COMMAND);

    expect(classified.trusted).toBe(true);
    expect(classified.source).toBe(InputSource.USER_COMMAND);
    expect(classified.value).toBe('ls -la');
  });

  it('classifies NETWORK as untrusted', () => {
    const classified = classifyInput('some response', InputSource.NETWORK);

    expect(classified.trusted).toBe(false);
    expect(classified.source).toBe(InputSource.NETWORK);
  });

  it('classifies FILE_CONTENT as untrusted', () => {
    const classified = classifyInput('file data', InputSource.FILE_CONTENT);

    expect(classified.trusted).toBe(false);
    expect(classified.source).toBe(InputSource.FILE_CONTENT);
  });

  it('classifies ENVIRONMENT as untrusted', () => {
    const classified = classifyInput('env value', InputSource.ENVIRONMENT);

    expect(classified.trusted).toBe(false);
    expect(classified.source).toBe(InputSource.ENVIRONMENT);
  });
});

describe('Input Sanitization', () => {
  it('validates and passes valid input', () => {
    const result = sanitize('test command' as any, UserCommandSchema);

    expect(result).toBe('test command');
  });

  it('throws ZodError on invalid input', () => {
    expect(() => sanitize('' as any, UserCommandSchema)).toThrow(ZodError);
  });

  it('sanitizeAndTrust promotes untrusted to trusted', () => {
    const trusted = sanitizeAndTrust('some data', InputSource.NETWORK, UserCommandSchema);
    // Trusted type is returned (branded string)
    expect(typeof trusted).toBe('string');
  });

  it('rejects empty user command', () => {
    expect(() => sanitize('' as any, UserCommandSchema)).toThrow(ZodError);
  });

  it('rejects file path with null bytes', () => {
    expect(() => sanitize('/path/to/file\0' as any, FilePathSchema)).toThrow(ZodError);
  });

  it('trims whitespace before validation', () => {
    // UserCommandSchema uses trim(), so valid command with extra whitespace works
    const result = sanitize('  test  ' as any, UserCommandSchema);
    expect(result).toBe('test');
  });
});
