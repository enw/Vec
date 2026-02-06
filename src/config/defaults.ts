/**
 * Default configuration values
 */

import type { PermissionConfig } from './schema.js';

export const DEFAULT_CONFIG: PermissionConfig = {
  version: '1.0',
  mode: 'strict',
  rules: [],
  audit: {
    enabled: true,
  },
  tokenBudget: {
    limit: 100000,
    period: 'daily',
    alertThresholds: [0.5, 0.7, 0.8, 1.0],
  },
};
