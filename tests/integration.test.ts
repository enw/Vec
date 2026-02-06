/**
 * End-to-end integration tests for SecurityManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityManager } from '../src/security.js';
import { InputSource } from '../src/types.js';
import type { ApprovalResponse } from '../src/permission/prompts.js';
import type { TokenUsageEvent } from '../src/types.js';

describe('SecurityManager Integration', () => {
  it('initializes all subsystems', async () => {
    const manager = new SecurityManager();
    await manager.init();

    // Should be able to access subsystems
    expect(manager.getPermissionEngine()).toBeDefined();
    expect(manager.getEgressFilter()).toBeDefined();
  });

  it('executes full security flow', async () => {
    // Mock prompt that auto-approves
    const mockPrompt = async (): Promise<ApprovalResponse> => ({
      approved: true,
      createRule: false,
    });

    const manager = new SecurityManager({ promptFn: mockPrompt });
    await manager.init();

    // 1. Classify input
    const classified = manager.classifyInput(
      'read /data/file.txt',
      InputSource.USER_COMMAND
    );
    expect(classified.trusted).toBe(true);

    // 2. Check permission
    const allowed = await manager.checkPermission('fs.read', '/data/file.txt');
    expect(allowed).toBe(true);

    // 3. Check egress (clean data)
    const egressResult = await manager.checkEgress(
      'some clean data',
      'https://api.example.com'
    );
    expect(egressResult.allowed).toBe(true);
    expect(egressResult.findings).toHaveLength(0);
  });

  it('blocks data with secrets in egress', async () => {
    const manager = new SecurityManager();
    await manager.init();

    const sensitiveData = 'AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE';
    const result = await manager.checkEgress(
      sensitiveData,
      'https://api.example.com'
    );

    // Should be blocked (no permission engine approval)
    expect(result.allowed).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('allows clean data in egress', async () => {
    const manager = new SecurityManager();
    await manager.init();

    const cleanData = 'This is just normal text';
    const result = await manager.checkEgress(
      cleanData,
      'https://api.example.com'
    );

    expect(result.allowed).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('denies permission without matching rule', async () => {
    const manager = new SecurityManager(); // Uses default prompt (auto-deny)
    await manager.init();

    const allowed = await manager.checkPermission('fs.delete', '/important/file.txt');
    expect(allowed).toBe(false);
  });

  it('approves permission with matching rule', async () => {
    const manager = new SecurityManager();
    await manager.init();

    // Add a rule manually
    const engine = manager.getPermissionEngine();
    const config = {
      version: '1.0' as const,
      mode: 'strict' as const,
      rules: [
        {
          id: 'test-rule',
          action: 'fs.write' as const,
          pattern: '/tmp/*',
          approved: true,
          verbosity: 'minimal' as const,
          createdAt: new Date().toISOString(),
        },
      ],
      audit: { enabled: false },
    };

    // Create new engine with rule
    const { PermissionEngine } = await import('../src/permission/engine.js');
    const engineWithRule = new PermissionEngine({ config });

    // Replace in manager (via property access)
    (manager as any).permissionEngine = engineWithRule;

    const allowed = await manager.checkPermission('fs.write', '/tmp/test.txt');
    expect(allowed).toBe(true);
  });

  it('tracks tokens when config has budget', async () => {
    const manager = new SecurityManager();
    await manager.init();

    // Check if token tracker exists (depends on config having tokenBudget)
    try {
      const tracker = manager.getTokenTracker();

      const event: TokenUsageEvent = {
        model: 'test-model',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        timestamp: new Date().toISOString(),
      };

      const result = manager.trackTokens(event);
      expect(result.usage.used).toBe(150);
    } catch (err) {
      // No tokenBudget in config - this is expected
      expect((err as Error).message).toContain('Token tracker not initialized');
    }
  });

  it('validates untrusted network input', async () => {
    const manager = new SecurityManager();
    await manager.init();

    const classified = manager.classifyInput(
      'some network response',
      InputSource.NETWORK
    );

    expect(classified.trusted).toBe(false);
    expect(classified.source).toBe(InputSource.NETWORK);
  });
});
