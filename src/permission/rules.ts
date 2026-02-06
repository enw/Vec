/**
 * Rule matching and storage operations
 */

import { minimatch } from 'minimatch';
import { randomUUID } from 'crypto';
import { PermissionRuleSchema, type PermissionRule } from '../config/schema.js';
import type { PermissionAction } from '../types.js';

/**
 * Check if a rule is expired
 */
export function isExpired(rule: PermissionRule): boolean {
  if (!rule.expiresAt) {
    return false;
  }
  return new Date(rule.expiresAt).getTime() < Date.now();
}

/**
 * Find first matching rule for given action and target
 * Skips expired rules automatically
 */
export function matchRule(
  action: PermissionAction,
  target: string,
  rules: PermissionRule[]
): PermissionRule | null {
  for (const rule of rules) {
    // Skip expired rules
    if (isExpired(rule)) {
      continue;
    }

    // Check if action matches and pattern matches target
    if (rule.action === action && minimatch(target, rule.pattern)) {
      return rule;
    }
  }

  return null;
}

/**
 * Add a new rule to the rules array
 */
export function addRule(
  rules: PermissionRule[],
  newRule: Omit<PermissionRule, 'id' | 'createdAt'>
): PermissionRule[] {
  const ruleWithMetadata: PermissionRule = {
    ...newRule,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  // Validate with Zod schema
  const validated = PermissionRuleSchema.parse(ruleWithMetadata);

  return [...rules, validated];
}

/**
 * Remove a rule by ID
 */
export function removeRule(rules: PermissionRule[], ruleId: string): PermissionRule[] {
  return rules.filter((rule) => rule.id !== ruleId);
}
