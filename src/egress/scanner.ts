/**
 * Scanner engine for detecting secrets, credentials, and PII in strings
 */

import { SECRET_PATTERNS, PII_PATTERNS, type SecretPattern } from './patterns.js';
import type { ScanResult } from '../types.js';

export interface ScanOptions {
  includePatterns?: boolean;
  includeEntropy?: boolean;
  includePII?: boolean;
}

/**
 * Calculate Shannon entropy of a string
 * Higher entropy = more random = potentially a secret
 */
function calculateEntropy(str: string): number {
  const len = str.length;
  const frequencies = new Map<string, number>();

  // Count character frequencies
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  // Calculate entropy
  let entropy = 0;
  for (const count of frequencies.values()) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

/**
 * Check if a string has high entropy (potential secret)
 */
export function hasHighEntropy(str: string, threshold = 4.5): boolean {
  if (str.length <= 20) return false;
  return calculateEntropy(str) > threshold;
}

/**
 * Redact a match to show only first 4 and last 4 characters
 */
export function redactMatch(match: string): string {
  if (match.length <= 12) {
    return match.slice(0, 4) + '***';
  }
  return match.slice(0, 4) + '***' + match.slice(-4);
}

/**
 * Find line number for a match position in the data
 */
function getLineNumber(data: string, matchIndex: number): number {
  const upToMatch = data.slice(0, matchIndex);
  return upToMatch.split('\n').length;
}

/**
 * Scan patterns against data
 */
function scanPatterns(data: string, patterns: SecretPattern[]): ScanResult['findings'] {
  const findings: ScanResult['findings'] = [];

  for (const { name, pattern } of patterns) {
    // Reset regex state for global patterns
    pattern.lastIndex = 0;

    const matches = data.matchAll(pattern);
    for (const match of matches) {
      if (match.index !== undefined) {
        findings.push({
          type: name,
          line: getLineNumber(data, match.index),
          match: redactMatch(match[0]),
        });
      }
    }
  }

  return findings;
}

/**
 * Scan for high-entropy strings
 */
function scanEntropy(data: string, threshold = 4.5): ScanResult['findings'] {
  const findings: ScanResult['findings'] = [];
  const lines = data.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const tokens = line.split(/\s+/);

    for (const token of tokens) {
      if (hasHighEntropy(token, threshold)) {
        findings.push({
          type: 'HIGH_ENTROPY',
          line: lineIdx + 1,
          match: redactMatch(token),
        });
      }
    }
  }

  return findings;
}

/**
 * Scan data for secrets, credentials, and PII
 */
export function scanForSecrets(
  data: string,
  options: ScanOptions = {}
): ScanResult {
  const {
    includePatterns = true,
    includeEntropy = true,
    includePII = true,
  } = options;

  const findings: ScanResult['findings'] = [];

  // Pattern-based detection for secrets
  if (includePatterns) {
    findings.push(...scanPatterns(data, SECRET_PATTERNS));
  }

  // PII detection
  if (includePII) {
    findings.push(...scanPatterns(data, PII_PATTERNS));
  }

  // Entropy-based detection
  if (includeEntropy) {
    findings.push(...scanEntropy(data));
  }

  return {
    hasSecrets: findings.length > 0,
    findings,
  };
}
