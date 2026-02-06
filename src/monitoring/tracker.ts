/**
 * Token usage tracker with budget management and alerting
 */

import type { TokenUsageEvent } from '../types.js';
import type { TokenBudget } from '../config/schema.js';
import { BudgetManager } from './budget.js';
import { AlertManager, type Alert } from './alerts.js';
import { monitorLogger, auditEvent } from '../audit/logger.js';

export class TokenTracker {
  private readonly budget: BudgetManager;
  private readonly alerts: AlertManager;
  private readonly history: TokenUsageEvent[] = [];
  private readonly maxHistory: number;

  private constructor(config: TokenBudget, maxHistory: number = 100, onAlert?: (alert: Alert) => void) {
    this.budget = new BudgetManager(config);
    this.alerts = new AlertManager(config.alertThresholds);
    this.maxHistory = maxHistory;

    if (onAlert) {
      this.alerts.setCallback(onAlert);
    }
  }

  /**
   * Track a token usage event
   */
  track(event: TokenUsageEvent): {
    alert: Alert | null;
    usage: ReturnType<BudgetManager['getUsage']>;
  } {
    // Check and reset if period expired
    const wasReset = this.budget.checkAndResetIfExpired();
    if (wasReset) {
      this.alerts.reset();
      monitorLogger.info('Budget period reset');
    }

    // Record tokens
    this.budget.record(event.totalTokens);

    // Get current usage
    const usage = this.budget.getUsage();

    // Evaluate alerts
    const alert = this.alerts.evaluate(usage.percentage);

    // Log event
    monitorLogger.info({
      model: event.model,
      tokens: event.totalTokens,
      budgetPercentage: (usage.percentage * 100).toFixed(1) + '%',
      remaining: usage.remaining,
    }, `Tracked ${event.totalTokens} tokens (${event.model})`);

    // Add to history
    this.addToHistory(event);

    return { alert, usage };
  }

  /**
   * Get current usage statistics
   */
  getUsage(): { used: number; limit: number; percentage: number; remaining: number } {
    return this.budget.getUsage();
  }

  /**
   * Get usage history
   */
  getHistory(): TokenUsageEvent[] {
    return [...this.history];
  }

  /**
   * Reset budget and alerts
   */
  reset(): void {
    this.budget.reset();
    this.alerts.reset();
    this.history.length = 0;
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    budget: ReturnType<BudgetManager['serialize']>;
    history: TokenUsageEvent[];
  } {
    return {
      budget: this.budget.serialize(),
      history: this.getHistory(),
    };
  }

  /**
   * Create new tracker instance
   */
  static create(config: TokenBudget, onAlert?: (alert: Alert) => void): TokenTracker {
    return new TokenTracker(config, 100, onAlert);
  }

  /**
   * Restore from persisted state
   */
  static deserialize(
    data: { budget: ReturnType<BudgetManager['serialize']>; history: TokenUsageEvent[] },
    config: TokenBudget,
    onAlert?: (alert: Alert) => void
  ): TokenTracker {
    const tracker = new TokenTracker(config, 100, onAlert);

    // Restore budget state
    const restoredBudget = BudgetManager.deserialize(data.budget, config);
    (tracker as any).budget = restoredBudget;

    // Restore history
    tracker.history.push(...data.history.slice(-100));

    return tracker;
  }

  /**
   * Add event to history (circular buffer)
   */
  private addToHistory(event: TokenUsageEvent): void {
    this.history.push(event);

    // Keep only last maxHistory events
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
}
