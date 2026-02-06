/**
 * SecurityManager - Unified facade for all security subsystems
 * Wires together permission, egress, validation, and monitoring
 */

import { PermissionEngine } from './permission/engine.js';
import { EgressFilter } from './egress/filter.js';
import { TokenTracker } from './monitoring/tracker.js';
import { classifyInput } from './validation/classifier.js';
import { loadConfig } from './config/loader.js';
import type { PermissionAction } from './config/schema.js';
import type { ClassifiedInput } from './validation/classifier.js';
import type { TokenUsageEvent } from './types.js';
import type { Alert } from './monitoring/alerts.js';
import type { PermissionPromptFn } from './permission/prompts.js';
import { InputSource } from './types.js';

export interface SecurityManagerOptions {
  configPath?: string;
  promptFn?: PermissionPromptFn;
  onAlert?: (alert: Alert) => void;
}

/**
 * Unified security facade - single entry point for all security operations
 */
export class SecurityManager {
  private config?: Awaited<ReturnType<typeof loadConfig>>;
  private permissionEngine?: PermissionEngine;
  private egressFilter?: EgressFilter;
  private tokenTracker?: TokenTracker;
  private initialized = false;
  private options: SecurityManagerOptions;

  constructor(options: SecurityManagerOptions = {}) {
    this.options = options;
  }

  /**
   * Initialize all security subsystems
   */
  async init(): Promise<void> {
    // Load config
    this.config = await loadConfig();

    // Create permission engine
    this.permissionEngine = new PermissionEngine({
      config: this.config,
      promptFn: this.options.promptFn,
    });

    // Create egress filter (references permission engine)
    this.egressFilter = new EgressFilter({
      permissionEngine: this.permissionEngine,
      mode: 'block',
    });

    // Create token tracker (if config has token budget)
    if (this.config.tokenBudget) {
      this.tokenTracker = TokenTracker.create(
        this.config.tokenBudget,
        this.options.onAlert
      );
    }

    this.initialized = true;
  }

  /**
   * Check if operation is permitted
   */
  async checkPermission(action: PermissionAction, target: string): Promise<boolean> {
    this.ensureInitialized();
    return this.permissionEngine!.check(action, target);
  }

  /**
   * Check egress data for sensitive content
   */
  async checkEgress(
    data: string,
    destination: string
  ): Promise<{ allowed: boolean; findings: any[] }> {
    this.ensureInitialized();
    return this.egressFilter!.check(data, destination);
  }

  /**
   * Track token usage and check budget
   */
  trackTokens(event: TokenUsageEvent): {
    alert: Alert | null;
    usage: { used: number; limit: number; percentage: number; remaining: number };
  } {
    this.ensureInitialized();

    if (!this.tokenTracker) {
      throw new Error('Token tracker not initialized - no tokenBudget in config');
    }

    return this.tokenTracker.track(event);
  }

  /**
   * Classify input by source
   */
  classifyInput(input: string, source: InputSource): ClassifiedInput {
    return classifyInput(input, source);
  }

  /**
   * Get direct access to permission engine
   */
  getPermissionEngine(): PermissionEngine {
    this.ensureInitialized();
    return this.permissionEngine!;
  }

  /**
   * Get direct access to egress filter
   */
  getEgressFilter(): EgressFilter {
    this.ensureInitialized();
    return this.egressFilter!;
  }

  /**
   * Get direct access to token tracker
   */
  getTokenTracker(): TokenTracker {
    this.ensureInitialized();
    if (!this.tokenTracker) {
      throw new Error('Token tracker not initialized - no tokenBudget in config');
    }
    return this.tokenTracker;
  }

  /**
   * Ensure subsystems are initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SecurityManager not initialized - call init() first');
    }
  }
}
