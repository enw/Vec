/**
 * Vec - Secure personal assistant with persistent memory
 * Public API barrel exports
 */

// Core types (excluding PermissionAction which comes from config)
export type { TrustedInput, UntrustedInput, ScanResult, TokenUsageEvent } from './types.js';
export { InputSource } from './types.js';

// Configuration
export * from './config/index.js';

// Permission system
export * from './permission/index.js';

// Input validation
export * from './validation/index.js';

// Egress filtering
export * from './egress/index.js';

// Token monitoring
export * from './monitoring/index.js';

// Audit/logging
export * from './audit/index.js';

// Unified security facade
export { SecurityManager, type SecurityManagerOptions } from './security.js';
