/**
 * User-facing permission prompt interface
 */

import type { PermissionAction } from '../config/schema.js';

/**
 * Response from permission prompt
 */
export interface ApprovalResponse {
  approved: boolean;
  createRule: boolean;
  rulePattern?: string;
}

/**
 * Function type for permission prompts
 */
export type PermissionPromptFn = (
  action: PermissionAction,
  target: string,
  context?: string
) => Promise<ApprovalResponse>;

/**
 * Default prompt function for non-interactive contexts
 * Auto-denies all requests (safe default)
 */
export const defaultPromptFn: PermissionPromptFn = async (
  _action: PermissionAction,
  _target: string,
  _context?: string
): Promise<ApprovalResponse> => {
  return {
    approved: false,
    createRule: false,
  };
};

/**
 * Format a permission prompt for display
 */
export function formatPermissionPrompt(
  action: PermissionAction,
  target: string,
  verbosity: 'minimal' | 'detailed' | 'custom'
): string {
  if (verbosity === 'minimal') {
    return `Allow ${action} on ${target}? [y/N/r(ule)]`;
  }

  // detailed mode
  const actionDescriptions: Record<PermissionAction, { description: string; risk: string }> = {
    'fs.read': {
      description: 'Read file or directory contents from filesystem',
      risk: 'Medium - may expose sensitive data',
    },
    'fs.write': {
      description: 'Create or modify files/directories',
      risk: 'High - can alter system state',
    },
    'fs.delete': {
      description: 'Delete files or directories',
      risk: 'Critical - irreversible data loss',
    },
    'egress.network': {
      description: 'Send data over network',
      risk: 'High - potential data exfiltration',
    },
    'egress.file': {
      description: 'Write data to external file location',
      risk: 'High - potential data leak',
    },
  };

  const info = actionDescriptions[action];

  return `
=== Permission Request ===
Action: ${action}
Target: ${target}

Description: ${info.description}
Risk Level: ${info.risk}

Allow this operation?
  y - Approve once
  r - Approve and create rule for similar requests
  N - Deny (default)
`;
}
