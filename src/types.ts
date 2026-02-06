/**
 * Shared types used across all Vec security modules
 */

// Branded types for input classification
export type TrustedInput = string & { __brand: 'trusted' };
export type UntrustedInput = string & { __brand: 'untrusted' };

// Input source classification
export enum InputSource {
  USER_COMMAND = 'user_command',
  FILE_CONTENT = 'file_content',
  NETWORK = 'network',
  ENVIRONMENT = 'environment',
}

// Permission actions
export type PermissionAction =
  | 'fs.read'
  | 'fs.write'
  | 'fs.delete'
  | 'egress.network'
  | 'egress.file';

// Secret scanning result
export interface ScanResult {
  hasSecrets: boolean;
  findings: Array<{
    type: string;
    line: number;
    match: string;
  }>;
}

// Token usage tracking
export interface TokenUsageEvent {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: string;
}
