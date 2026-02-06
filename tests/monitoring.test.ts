/**
 * Token monitoring and budget tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetManager } from '../src/monitoring/budget.js';
import { AlertManager, type Alert } from '../src/monitoring/alerts.js';
import { TokenTracker } from '../src/monitoring/tracker.js';
import type { TokenBudget, TokenUsageEvent } from '../src/index.js';

describe('BudgetManager', () => {
  let config: TokenBudget;

  beforeEach(() => {
    config = {
      limit: 1000,
      period: 'daily',
      alertThresholds: [0.5, 0.7, 0.8, 1.0],
    };
  });

  it('tracks usage correctly', () => {
    const budget = new BudgetManager(config);

    budget.record(100);
    let usage = budget.getUsage();
    expect(usage.used).toBe(100);
    expect(usage.remaining).toBe(900);

    budget.record(400);
    usage = budget.getUsage();
    expect(usage.used).toBe(500);
    expect(usage.remaining).toBe(500);
  });

  it('calculates percentage correctly', () => {
    const budget = new BudgetManager(config);

    budget.record(500);
    const usage = budget.getUsage();
    expect(usage.percentage).toBe(0.5);
  });

  it('resets on period expiry', () => {
    const budget = new BudgetManager(config);

    budget.record(500);
    expect(budget.getUsage().used).toBe(500);

    budget.reset();
    expect(budget.getUsage().used).toBe(0);
    expect(budget.getUsage().remaining).toBe(1000);
  });

  it('detects period expiry for daily budget', () => {
    const budget = new BudgetManager(config);

    // Just created, not expired
    expect(budget.isExpired()).toBe(false);
  });

  it('serializes and deserializes state', () => {
    const budget = new BudgetManager(config);
    budget.record(250);

    const serialized = budget.serialize();
    expect(serialized.used).toBe(250);

    const restored = BudgetManager.deserialize(serialized, config);
    expect(restored.getUsage().used).toBe(250);
  });
});

describe('AlertManager', () => {
  it('fires alerts at thresholds', () => {
    const alerts = new AlertManager([0.5, 0.7, 0.8, 1.0]);

    // Below all thresholds
    let alert = alerts.evaluate(0.4);
    expect(alert).toBeNull();

    // Hit 50% threshold
    alert = alerts.evaluate(0.55);
    expect(alert).not.toBeNull();
    expect(alert?.threshold).toBe(0.5);
    expect(alert?.level).toBe('info');
  });

  it('does not re-fire same threshold', () => {
    const alerts = new AlertManager([0.5, 0.7, 0.8, 1.0]);

    // Fire 50%
    let alert = alerts.evaluate(0.55);
    expect(alert?.threshold).toBe(0.5);

    // Still at 55%, should not fire again
    alert = alerts.evaluate(0.55);
    expect(alert).toBeNull();
  });

  it('assigns correct alert levels', () => {
    const alerts = new AlertManager([0.5, 0.7, 0.8, 1.0]);

    // 50% = info
    let alert = alerts.evaluate(0.55);
    expect(alert?.level).toBe('info');

    // 70% = warning
    alert = alerts.evaluate(0.75);
    expect(alert?.level).toBe('warning');

    // 100% = critical
    alert = alerts.evaluate(1.0);
    expect(alert?.level).toBe('critical');
  });

  it('resets fired thresholds', () => {
    const alerts = new AlertManager([0.5, 0.7, 0.8, 1.0]);

    // Fire 50%
    let alert = alerts.evaluate(0.55);
    expect(alert?.threshold).toBe(0.5);

    // Reset
    alerts.reset();

    // Should fire again
    alert = alerts.evaluate(0.55);
    expect(alert?.threshold).toBe(0.5);
  });

  it('calls callback when provided', () => {
    let callbackFired = false;
    let receivedAlert: Alert | null = null;

    const alerts = new AlertManager([0.5, 0.7, 0.8, 1.0]);
    alerts.setCallback((alert) => {
      callbackFired = true;
      receivedAlert = alert;
    });

    alerts.evaluate(0.6);

    expect(callbackFired).toBe(true);
    expect(receivedAlert).not.toBeNull();
    expect(receivedAlert?.threshold).toBe(0.5);
  });
});

describe('TokenTracker', () => {
  let config: TokenBudget;

  beforeEach(() => {
    config = {
      limit: 1000,
      period: 'daily',
      alertThresholds: [0.5, 0.7, 0.8, 1.0],
    };
  });

  it('tracks events and returns usage', () => {
    const tracker = TokenTracker.create(config);

    const event: TokenUsageEvent = {
      model: 'gpt-4',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      timestamp: new Date().toISOString(),
    };

    const result = tracker.track(event);

    expect(result.usage.used).toBe(150);
    expect(result.usage.remaining).toBe(850);
    expect(result.alert).toBeNull(); // Below first threshold
  });

  it('fires alerts at thresholds', () => {
    const tracker = TokenTracker.create(config);

    // Use 50% + some
    const event: TokenUsageEvent = {
      model: 'gpt-4',
      promptTokens: 400,
      completionTokens: 100,
      totalTokens: 500,
      timestamp: new Date().toISOString(),
    };

    const result = tracker.track(event);

    expect(result.alert).not.toBeNull();
    expect(result.alert?.threshold).toBe(0.5);
  });

  it('maintains history of events', () => {
    const tracker = TokenTracker.create(config);

    tracker.track({
      model: 'gpt-4',
      promptTokens: 50,
      completionTokens: 50,
      totalTokens: 100,
      timestamp: new Date().toISOString(),
    });

    tracker.track({
      model: 'gpt-3.5',
      promptTokens: 30,
      completionTokens: 20,
      totalTokens: 50,
      timestamp: new Date().toISOString(),
    });

    const history = tracker.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].model).toBe('gpt-4');
    expect(history[1].model).toBe('gpt-3.5');
  });

  it('serializes state for persistence', () => {
    const tracker = TokenTracker.create(config);

    tracker.track({
      model: 'gpt-4',
      promptTokens: 100,
      completionTokens: 100,
      totalTokens: 200,
      timestamp: new Date().toISOString(),
    });

    const serialized = tracker.serialize();

    expect(serialized.budget.used).toBe(200);
    expect(serialized.history).toHaveLength(1);
  });
});
