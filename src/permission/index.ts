/**
 * Permission system exports
 */

// Engine
export {
  PermissionEngine,
  PermissionDeniedError,
  createPermissionEngine,
} from './engine.js';

// Rules
export {
  matchRule,
  addRule,
  removeRule,
  isExpired,
} from './rules.js';

// Prompts
export {
  defaultPromptFn,
  formatPermissionPrompt,
  type ApprovalResponse,
  type PermissionPromptFn,
} from './prompts.js';
