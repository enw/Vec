/**
 * Egress filtering and secret scanning tests
 */

import { describe, it, expect } from 'vitest';
import { scanForSecrets, hasHighEntropy } from '../src/egress/scanner.js';
import { EgressFilter } from '../src/egress/filter.js';

describe('Secret Scanning', () => {
  it('detects AWS access keys', () => {
    const data = 'AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE';
    const result = scanForSecrets(data);

    expect(result.hasSecrets).toBe(true);
    expect(result.findings.some((f) => f.type === 'AWS_ACCESS_KEY')).toBe(true);
  });

  it('detects AWS secret keys', () => {
    const data = 'AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    const result = scanForSecrets(data);

    expect(result.hasSecrets).toBe(true);
    expect(result.findings.some((f) => f.type === 'AWS_SECRET_KEY')).toBe(true);
  });

  it('detects GitHub tokens', () => {
    const data = 'token=ghp_1234567890abcdefghijklmnopqrstuvwxyz';
    const result = scanForSecrets(data);

    expect(result.hasSecrets).toBe(true);
    expect(result.findings.some((f) => f.type === 'GITHUB_TOKEN')).toBe(true);
  });

  it('detects private keys', () => {
    const data = `
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz
-----END RSA PRIVATE KEY-----
    `;
    const result = scanForSecrets(data);

    expect(result.hasSecrets).toBe(true);
    expect(result.findings.some((f) => f.type === 'PRIVATE_KEY')).toBe(true);
  });

  it('detects JWTs', () => {
    const data = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const result = scanForSecrets(data);

    expect(result.hasSecrets).toBe(true);
    expect(result.findings.some((f) => f.type === 'JWT')).toBe(true);
  });

  it('passes clean data', () => {
    const data = 'This is just normal text without secrets';
    const result = scanForSecrets(data);

    expect(result.hasSecrets).toBe(false);
    expect(result.findings).toHaveLength(0);
  });
});

describe('High Entropy Detection', () => {
  it('detects high entropy strings', () => {
    const highEntropyString = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    expect(hasHighEntropy(highEntropyString)).toBe(true);
  });

  it('passes low entropy strings', () => {
    const lowEntropyString = 'hello world hello world';
    expect(hasHighEntropy(lowEntropyString)).toBe(false);
  });
});

describe('PII Detection', () => {
  it('detects email addresses', () => {
    const data = 'Contact: user@example.com';
    const result = scanForSecrets(data);

    expect(result.hasSecrets).toBe(true);
    expect(result.findings.some((f) => f.type === 'EMAIL')).toBe(true);
  });

  it('detects phone numbers', () => {
    const data = 'Call me at 555-123-4567';
    const result = scanForSecrets(data);

    expect(result.hasSecrets).toBe(true);
    expect(result.findings.some((f) => f.type === 'PHONE_US')).toBe(true);
  });
});

describe('EgressFilter Modes', () => {
  it('blocks in block mode when secrets detected', async () => {
    const filter = new EgressFilter({ mode: 'block' });
    const data = 'AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE';

    const result = await filter.check(data, 'https://api.example.com');

    expect(result.allowed).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('allows in log-only mode even with secrets', async () => {
    const filter = new EgressFilter({ mode: 'log-only' });
    const data = 'AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE';

    const result = await filter.check(data, 'https://api.example.com');

    expect(result.allowed).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('allows in warn mode even with secrets', async () => {
    const filter = new EgressFilter({ mode: 'warn' });
    const data = 'AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE';

    const result = await filter.check(data, 'https://api.example.com');

    expect(result.allowed).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('allows clean data in all modes', async () => {
    const filter = new EgressFilter({ mode: 'block' });
    const data = 'This is clean data';

    const result = await filter.check(data, 'https://api.example.com');

    expect(result.allowed).toBe(true);
    expect(result.findings).toHaveLength(0);
  });
});
