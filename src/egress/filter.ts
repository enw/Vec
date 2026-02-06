/**
 * Egress filter gate - blocks or warns when sensitive data detected in outbound data
 */

import { scanForSecrets } from './scanner.js';
import { egressLogger, auditEvent } from '../audit/logger.js';
import type { ScanResult } from '../types.js';
import type { PermissionEngine } from '../permission/engine.js';

export type EgressMode = 'block' | 'warn' | 'log-only';

export interface EgressCheckResult {
  allowed: boolean;
  findings: ScanResult['findings'];
}

/**
 * Egress filter for scanning and gating outbound data
 */
export class EgressFilter {
  private mode: EgressMode;
  private permissionEngine?: PermissionEngine;
  private logger = egressLogger.child({ filter: 'EgressFilter' });

  constructor(options?: { permissionEngine?: PermissionEngine; mode?: EgressMode }) {
    this.mode = options?.mode || 'block';
    this.permissionEngine = options?.permissionEngine;
  }

  /**
   * Check outbound data for sensitive content
   */
  async check(data: string, destination: string): Promise<EgressCheckResult> {
    const scanResult = scanForSecrets(data);

    // Clean data - allow through
    if (!scanResult.hasSecrets) {
      this.logger.debug({ destination, mode: this.mode }, 'Egress scan: clean');
      auditEvent({
        type: 'egress',
        action: 'scan',
        target: destination,
        approved: true,
        details: { findingCount: 0, mode: this.mode },
      });

      return { allowed: true, findings: [] };
    }

    // Found sensitive data
    const findingTypes = [...new Set(scanResult.findings.map((f) => f.type))];
    const criticalCount = scanResult.findings.filter((f) =>
      ['AWS_ACCESS_KEY', 'AWS_SECRET_KEY', 'GITHUB_PAT', 'STRIPE_KEY', 'SSN', 'PRIVATE_KEY'].includes(
        f.type
      )
    ).length;

    this.logger.warn(
      {
        destination,
        mode: this.mode,
        findingCount: scanResult.findings.length,
        findingTypes,
        criticalCount,
      },
      'Egress scan: sensitive data detected'
    );

    // Handle based on mode
    switch (this.mode) {
      case 'log-only': {
        auditEvent({
          type: 'egress',
          action: 'scan',
          target: destination,
          approved: true,
          details: {
            findingCount: scanResult.findings.length,
            findingTypes,
            criticalCount,
            mode: 'log-only',
          },
        });
        return { allowed: true, findings: scanResult.findings };
      }

      case 'warn': {
        auditEvent({
          type: 'egress',
          action: 'scan',
          target: destination,
          approved: true,
          details: {
            findingCount: scanResult.findings.length,
            findingTypes,
            criticalCount,
            mode: 'warn',
            warning: 'Sensitive data detected but allowed through',
          },
        });
        return { allowed: true, findings: scanResult.findings };
      }

      case 'block': {
        // Determine permission action based on destination
        const action = destination.startsWith('http://') || destination.startsWith('https://')
          ? 'egress.network'
          : 'egress.file';

        // Check with permission engine if available
        let allowed = false;
        if (this.permissionEngine) {
          try {
            allowed = await this.permissionEngine.check(action, destination);
          } catch (err) {
            this.logger.error({ err, destination }, 'Permission check failed');
            allowed = false;
          }
        }

        auditEvent({
          type: 'egress',
          action: 'scan',
          target: destination,
          approved: allowed,
          details: {
            findingCount: scanResult.findings.length,
            findingTypes,
            criticalCount,
            mode: 'block',
            permissionChecked: !!this.permissionEngine,
          },
        });

        return { allowed, findings: scanResult.findings };
      }
    }
  }

  /**
   * Scan data without gating logic
   */
  scanOnly(data: string): ScanResult {
    return scanForSecrets(data);
  }

  /**
   * Get current mode
   */
  getMode(): EgressMode {
    return this.mode;
  }

  /**
   * Set new mode
   */
  setMode(mode: EgressMode): void {
    this.mode = mode;
    this.logger.info({ mode }, 'Egress filter mode changed');
  }
}
