/**
 * Threshold-based alert system for budget monitoring
 */

import { monitorLogger } from '../audit/logger.js';

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface Alert {
  level: AlertLevel;
  threshold: number;
  actual: number;
  message: string;
  timestamp: string;
}

export class AlertManager {
  private readonly thresholds: number[];
  private firedThresholds: Set<number> = new Set();
  private alertCallback?: (alert: Alert) => void;

  constructor(thresholds: number[] = [0.5, 0.7, 0.8, 1.0]) {
    this.thresholds = [...thresholds].sort((a, b) => a - b);
  }

  /**
   * Set callback for UI integration
   */
  setCallback(fn: (alert: Alert) => void): void {
    this.alertCallback = fn;
  }

  /**
   * Evaluate current percentage against thresholds
   */
  evaluate(percentage: number): Alert | null {
    // Find highest threshold exceeded that hasn't fired yet
    let highestUnfired: number | null = null;

    for (const threshold of this.thresholds) {
      if (percentage >= threshold && !this.firedThresholds.has(threshold)) {
        highestUnfired = threshold;
      }
    }

    if (highestUnfired === null) {
      return null;
    }

    // Create alert
    const level = this.getAlertLevel(highestUnfired);
    const alert: Alert = {
      level,
      threshold: highestUnfired,
      actual: percentage,
      message: `Token budget at ${(percentage * 100).toFixed(1)}% (${(highestUnfired * 100)}% threshold)`,
      timestamp: new Date().toISOString(),
    };

    // Mark as fired
    this.firedThresholds.add(highestUnfired);

    // Log event
    monitorLogger.warn({
      alert: true,
      level: alert.level,
      threshold: alert.threshold,
      actual: alert.actual,
    }, alert.message);

    // Fire callback if set
    if (this.alertCallback) {
      this.alertCallback(alert);
    }

    return alert;
  }

  /**
   * Get alert level for threshold
   */
  getAlertLevel(threshold: number): AlertLevel {
    if (threshold >= 0.9) return 'critical';
    if (threshold >= 0.7) return 'warning';
    return 'info';
  }

  /**
   * Reset fired thresholds (e.g., on budget period reset)
   */
  reset(): void {
    this.firedThresholds.clear();
  }
}
