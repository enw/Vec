/**
 * Budget management with period-based token tracking and reset
 */

import type { TokenBudget } from '../config/schema.js';

export class BudgetManager {
  private used: number = 0;
  private periodStart: Date;
  private alertedThresholds: Set<number> = new Set();
  private readonly config: TokenBudget;

  constructor(config: TokenBudget) {
    this.config = config;
    this.periodStart = new Date();
  }

  /**
   * Record token usage
   */
  record(tokens: number): void {
    this.used += tokens;
  }

  /**
   * Get current usage statistics
   */
  getUsage(): { used: number; limit: number; percentage: number; remaining: number } {
    const percentage = this.used / this.config.limit;
    return {
      used: this.used,
      limit: this.config.limit,
      percentage,
      remaining: Math.max(0, this.config.limit - this.used),
    };
  }

  /**
   * Check if current period has expired
   */
  isExpired(): boolean {
    const now = new Date();
    const elapsed = now.getTime() - this.periodStart.getTime();

    switch (this.config.period) {
      case 'daily':
        return elapsed > 24 * 60 * 60 * 1000;
      case 'weekly':
        return elapsed > 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return elapsed > 30 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Reset budget to start of new period
   */
  reset(): void {
    this.used = 0;
    this.periodStart = new Date();
    this.alertedThresholds.clear();
  }

  /**
   * Check if period expired and reset if needed
   */
  checkAndResetIfExpired(): boolean {
    if (this.isExpired()) {
      this.reset();
      return true;
    }
    return false;
  }

  /**
   * Get alerted thresholds for alert manager coordination
   */
  getAlertedThresholds(): Set<number> {
    return this.alertedThresholds;
  }

  /**
   * Mark threshold as alerted
   */
  markThresholdAlerted(threshold: number): void {
    this.alertedThresholds.add(threshold);
  }

  /**
   * Serialize for persistence
   */
  serialize(): { used: number; periodStart: string; alertedThresholds: number[] } {
    return {
      used: this.used,
      periodStart: this.periodStart.toISOString(),
      alertedThresholds: Array.from(this.alertedThresholds),
    };
  }

  /**
   * Restore from persisted state
   */
  static deserialize(
    data: { used: number; periodStart: string; alertedThresholds: number[] },
    config: TokenBudget
  ): BudgetManager {
    const manager = new BudgetManager(config);
    manager.used = data.used;
    manager.periodStart = new Date(data.periodStart);
    manager.alertedThresholds = new Set(data.alertedThresholds);
    return manager;
  }
}
