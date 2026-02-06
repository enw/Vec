import sanitize from 'sanitize-filename';

export interface ValidationResult {
  valid: boolean;
  sanitized: string;
  error?: string;
}

export function validateWorkspaceName(name: string): ValidationResult {
  // First apply cross-platform sanitization
  const sanitized = sanitize(name);

  // Check length
  if (sanitized.length === 0) {
    return {
      valid: false,
      sanitized,
      error: 'Workspace name cannot be empty.',
    };
  }

  if (sanitized.length > 100) {
    return {
      valid: false,
      sanitized,
      error: 'Workspace name must be 100 characters or less.',
    };
  }

  // Additional restriction: alphanumeric + hyphens + underscores only
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(sanitized)) {
    return {
      valid: false,
      sanitized,
      error: 'Workspace name contains invalid characters. Use alphanumeric, hyphens, underscores only.',
    };
  }

  return {
    valid: true,
    sanitized,
  };
}
