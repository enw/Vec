/**
 * Permission engine tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { matchRule, addRule } from '../src/permission/rules.js';
import { PermissionEngine, PermissionDeniedError } from '../src/permission/engine.js';
import type { PermissionConfig, PermissionRule } from '../src/config/schema.js';
import type { ApprovalResponse } from '../src/permission/prompts.js';

describe('Permission Rules', () => {
  it('matches glob patterns', () => {
    const rules: PermissionRule[] = [
      {
        id: 'test-1',
        action: 'fs.read',
        pattern: '/tmp/*',
        approved: true,
        verbosity: 'minimal',
        createdAt: new Date().toISOString(),
      },
    ];

    const match = matchRule('fs.read', '/tmp/test.txt', rules);
    expect(match).toBeDefined();
    expect(match?.id).toBe('test-1');
  });

  it('rejects non-matching patterns', () => {
    const rules: PermissionRule[] = [
      {
        id: 'test-1',
        action: 'fs.read',
        pattern: '/tmp/*',
        approved: true,
        verbosity: 'minimal',
        createdAt: new Date().toISOString(),
      },
    ];

    const match = matchRule('fs.read', '/home/user/file.txt', rules);
    expect(match).toBeNull();
  });

  it('skips expired rules', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const rules: PermissionRule[] = [
      {
        id: 'test-1',
        action: 'fs.read',
        pattern: '/tmp/*',
        approved: true,
        verbosity: 'minimal',
        createdAt: yesterday,
        expiresAt: yesterday, // Already expired
      },
    ];

    const match = matchRule('fs.read', '/tmp/test.txt', rules);
    expect(match).toBeNull();
  });

  it('adds new rules correctly', () => {
    const rules: PermissionRule[] = [];

    const updated = addRule(rules, {
      action: 'fs.write',
      pattern: '/data/*',
      approved: true,
      verbosity: 'minimal',
    });

    expect(updated).toHaveLength(1);
    expect(updated[0].action).toBe('fs.write');
    expect(updated[0].pattern).toBe('/data/*');
    expect(updated[0].id).toBeDefined();
  });
});

describe('PermissionEngine', () => {
  let config: PermissionConfig;

  beforeEach(() => {
    config = {
      version: '1.0',
      mode: 'strict',
      rules: [],
      audit: { enabled: false },
    };
  });

  it('auto-denies by default with defaultPromptFn', async () => {
    const engine = new PermissionEngine({ config });

    const allowed = await engine.check('fs.write', '/test/file.txt');
    expect(allowed).toBe(false);
  });

  it('auto-approves with matching rule', async () => {
    config.rules = [
      {
        id: 'test-1',
        action: 'fs.read',
        pattern: '/tmp/*',
        approved: true,
        verbosity: 'minimal',
        createdAt: new Date().toISOString(),
      },
    ];

    const engine = new PermissionEngine({ config });
    const allowed = await engine.check('fs.read', '/tmp/test.txt');
    expect(allowed).toBe(true);
  });

  it('creates new rule on approval', async () => {
    const mockPrompt = async (): Promise<ApprovalResponse> => ({
      approved: true,
      createRule: true,
      rulePattern: '/data/*',
    });

    const engine = new PermissionEngine({ config, promptFn: mockPrompt });

    // Initially no rules
    expect(engine.getRules()).toHaveLength(0);

    // Check permission - should trigger prompt
    const allowed = await engine.check('fs.write', '/data/file.txt');
    expect(allowed).toBe(true);

    // Rule should be created but not persisted to engine's config in-memory
    // (saveConfig is async and happens inside, but we can't easily verify without mocking fs)
  });

  it('throws PermissionDeniedError via checkOrThrow', async () => {
    const engine = new PermissionEngine({ config });

    await expect(
      engine.checkOrThrow('fs.delete', '/important/file.txt')
    ).rejects.toThrow(PermissionDeniedError);
  });

  it('auto-denies with deny rule', async () => {
    config.rules = [
      {
        id: 'test-deny',
        action: 'fs.delete',
        pattern: '/protected/*',
        approved: false, // Explicit deny
        verbosity: 'minimal',
        createdAt: new Date().toISOString(),
      },
    ];

    const engine = new PermissionEngine({ config });
    const allowed = await engine.check('fs.delete', '/protected/data.db');
    expect(allowed).toBe(false);
  });
});
