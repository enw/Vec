/**
 * Permission engine with hybrid approval flow
 */

import { permissionLogger } from '../audit/logger.js';
import { loadConfig, saveConfig } from '../config/loader.js';
import type { PermissionConfig, PermissionAction, PermissionRule } from '../config/schema.js';
import { matchRule, addRule, removeRule } from './rules.js';
import { defaultPromptFn, type PermissionPromptFn } from './prompts.js';

/**
 * Error thrown when permission is denied
 */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly action: PermissionAction,
    public readonly target: string,
    message?: string
  ) {
    super(message || `Permission denied: ${action} on ${target}`);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Core permission engine
 */
export class PermissionEngine {
  private config: PermissionConfig;
  private promptFn: PermissionPromptFn;
  private logger = permissionLogger.child({ engine: 'PermissionEngine' });

  constructor(options: { config: PermissionConfig; promptFn?: PermissionPromptFn }) {
    this.config = options.config;
    this.promptFn = options.promptFn || defaultPromptFn;
  }

  /**
   * Check if action is permitted on target
   */
  async check(action: PermissionAction, target: string): Promise<boolean> {
    // 1. Check for existing rule
    const matchedRule = matchRule(action, target, this.config.rules);

    if (matchedRule) {
      if (matchedRule.approved) {
        this.logger.info(
          { action, target, ruleId: matchedRule.id, decision: 'auto-approved' },
          'Permission auto-approved by rule'
        );
        return true;
      } else {
        this.logger.warn(
          { action, target, ruleId: matchedRule.id, decision: 'auto-denied' },
          'Permission auto-denied by rule'
        );
        return false;
      }
    }

    // 2. No matching rule - prompt user
    this.logger.info({ action, target, decision: 'prompting' }, 'No rule found, prompting user');

    const response = await this.promptFn(action, target);

    // 3. If user approves and wants to create rule, persist it
    if (response.approved && response.createRule) {
      const pattern = response.rulePattern || target;
      this.config.rules = addRule(this.config.rules, {
        action,
        pattern,
        approved: true,
        verbosity: 'minimal',
      });

      // Save config to disk
      await saveConfig(this.config);

      this.logger.info(
        { action, target, pattern, decision: 'approved-with-rule' },
        'Permission approved and rule created'
      );
    } else if (response.approved) {
      this.logger.info({ action, target, decision: 'approved-once' }, 'Permission approved once');
    } else {
      this.logger.warn({ action, target, decision: 'denied' }, 'Permission denied by user');
    }

    return response.approved;
  }

  /**
   * Check permission and throw if denied
   */
  async checkOrThrow(action: PermissionAction, target: string): Promise<void> {
    const approved = await this.check(action, target);
    if (!approved) {
      throw new PermissionDeniedError(action, target);
    }
  }

  /**
   * Get all current rules
   */
  getRules(): PermissionRule[] {
    return [...this.config.rules];
  }

  /**
   * Remove a rule by ID
   */
  async removeRule(ruleId: string): Promise<void> {
    this.config.rules = removeRule(this.config.rules, ruleId);
    await saveConfig(this.config);
    this.logger.info({ ruleId }, 'Rule removed');
  }
}

/**
 * Create a permission engine with config loaded from disk
 */
export async function createPermissionEngine(
  options?: { promptFn?: PermissionPromptFn }
): Promise<PermissionEngine> {
  const config = await loadConfig();
  return new PermissionEngine({
    config,
    promptFn: options?.promptFn,
  });
}
