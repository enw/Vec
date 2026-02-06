/**
 * Pattern library for detecting secrets and PII in outbound data
 */

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium';
}

/**
 * Known credential and secret patterns
 */
export const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'AWS_ACCESS_KEY',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
  },
  {
    name: 'AWS_SECRET_KEY',
    pattern: /(?:aws_secret_access_key|secret_key)\s*[=:]\s*[A-Za-z0-9/+=]{40}/gi,
    severity: 'critical',
  },
  {
    name: 'GITHUB_TOKEN',
    pattern: /gh[pousr]_[A-Za-z0-9]{36,}/g,
    severity: 'critical',
  },
  {
    name: 'GITHUB_PAT',
    pattern: /github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}/g,
    severity: 'critical',
  },
  {
    name: 'PRIVATE_KEY',
    pattern: /-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----/g,
    severity: 'critical',
  },
  {
    name: 'JWT',
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    severity: 'high',
  },
  {
    name: 'GENERIC_API_KEY',
    pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"]?[A-Za-z0-9]{20,}['"]?/gi,
    severity: 'high',
  },
  {
    name: 'GENERIC_SECRET',
    pattern: /(?:secret|password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"]{8,}['"]?/gi,
    severity: 'high',
  },
  {
    name: 'SLACK_TOKEN',
    pattern: /xox[baprs]-[0-9]{10,}-[A-Za-z0-9-]+/g,
    severity: 'high',
  },
  {
    name: 'STRIPE_KEY',
    pattern: /sk_(test|live)_[A-Za-z0-9]{24,}/g,
    severity: 'critical',
  },
];

/**
 * PII patterns (less critical than secrets, but still sensitive)
 */
export const PII_PATTERNS: SecretPattern[] = [
  {
    name: 'EMAIL',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    severity: 'medium',
  },
  {
    name: 'PHONE_US',
    pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    severity: 'medium',
  },
  {
    name: 'SSN',
    // SSN format: 3-2-4 digits, excluding obvious non-SSNs like 000-xx-xxxx, xxx-00-xxxx, etc.
    pattern: /\b(?!000|666|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0000)\d{4}\b/g,
    severity: 'critical',
  },
  {
    name: 'IP_ADDRESS',
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    severity: 'medium',
  },
];
