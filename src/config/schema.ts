/**
 * Zod schemas for Vec configuration validation
 */

import { z } from 'zod';

// Permission actions
export const PermissionActionSchema = z.enum([
  'fs.read',
  'fs.write',
  'fs.delete',
  'egress.network',
  'egress.file',
]);

// Path pattern with glob validation
export const PathPatternSchema = z.string().min(1).refine(
  (pattern) => {
    // Validate glob pattern syntax
    try {
      new RegExp(pattern.replace(/\*/g, '.*'));
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid glob pattern' }
);

// Verbosity levels for permission prompts
export const VerbositySchema = z.enum(['minimal', 'detailed', 'custom']);

// Individual permission rule
export const PermissionRuleSchema = z.object({
  id: z.string().uuid().optional(),
  action: PermissionActionSchema,
  pattern: PathPatternSchema,
  approved: z.boolean(),
  verbosity: VerbositySchema.default('minimal'),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

// Audit configuration
export const AuditConfigSchema = z.object({
  enabled: z.boolean().default(true),
  logPath: z.string().optional(),
});

// Token budget configuration
export const TokenBudgetSchema = z.object({
  limit: z.number().positive(),
  period: z.enum(['daily', 'weekly', 'monthly']),
  alertThresholds: z.array(z.number().min(0).max(1)).default([0.5, 0.7, 0.8, 1.0]),
});

// Top-level permission config
export const PermissionConfigSchema = z.object({
  version: z.literal('1.0'),
  mode: z.enum(['strict', 'permissive']).default('strict'),
  rules: z.array(PermissionRuleSchema).default([]),
  audit: AuditConfigSchema.default({ enabled: true }),
  tokenBudget: TokenBudgetSchema.optional(),
});

// Inferred types
export type PermissionAction = z.infer<typeof PermissionActionSchema>;
export type PathPattern = z.infer<typeof PathPatternSchema>;
export type Verbosity = z.infer<typeof VerbositySchema>;
export type PermissionRule = z.infer<typeof PermissionRuleSchema>;
export type AuditConfig = z.infer<typeof AuditConfigSchema>;
export type TokenBudget = z.infer<typeof TokenBudgetSchema>;
export type PermissionConfig = z.infer<typeof PermissionConfigSchema>;
