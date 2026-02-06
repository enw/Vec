# Phase 1: Security & Foundation - Research

**Researched:** 2026-02-06
**Domain:** Permission systems and security guardrails for autonomous AI agents
**Confidence:** MEDIUM

## Summary

Permission systems for AI agents in 2026 require a layered security approach combining runtime permission gates, input validation, egress filtering, and observability. The OWASP Top 10 for Agentic Applications 2026 establishes that identity and privilege management (ASI03) and tool misuse (ASI02) are among the top four critical risks facing autonomous systems.

The standard stack centers on TypeScript with Zod for runtime validation, modern secret scanning tools (Gitleaks/TruffleHog) for credential detection, and structured logging (Pino) for audit trails. Node.js now provides a stable (v23.5+) permission model with `--allow-fs-read` and `--allow-fs-write` flags, though recent January 2026 security fixes highlight symlink bypass vulnerabilities requiring careful implementation.

**Primary recommendation:** Implement hybrid approval flow with Zod-validated permission rules stored in cosmiconfig-managed config, use Gitleaks for egress filtering, Pino for audit logging, and follow OWASP ASI03 least-privilege patterns with task-scoped permissions.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 3.x | Runtime schema validation | TypeScript-first, zero dependencies, bridges compile-time types with runtime checks. Industry standard for validating untrusted input at trust boundaries |
| Pino | 9.x | Structured logging | 5x faster than Winston, async logging with minimal overhead. Preferred for high-performance audit trails in 2026 |
| Gitleaks | 8.x | Secret scanning | Lightweight, fast pattern + entropy detection. Outperforms alternatives in speed while maintaining accuracy |
| Node.js Permission Model | 23.5+ | File system access control | Now stable (non-experimental). Native runtime sandboxing with `--allow-fs-read`/`--allow-fs-write` flags |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cosmiconfig | 9.x | Config file discovery | Standard convention-based config loading. Auto-finds .rc files, supports TypeScript |
| TruffleHog | 3.x | Secret verification | When verification of active credentials needed (800+ secret types, can verify validity) |
| fast-glob | 3.x | Path pattern matching | For implementing wildcard permission rules (e.g., `--allow-fs-write=/home/test*`) |
| minimatch | 9.x | Glob pattern matching | Lightweight alternative for simpler pattern matching needs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | io-ts, Yup | io-ts more functional-programming focused, Yup better for form validation but lacks TypeScript-first design |
| Pino | Winston | Winston more configurable with transport system, but 5x slower and higher overhead |
| Gitleaks | detect-secrets | detect-secrets minimizes false positives but slower and misses more real secrets |
| Node.js Permission Model | Custom fs wrapper | Custom solution avoids experimental features but lacks native runtime enforcement |

**Installation:**
```bash
pnpm add zod pino cosmiconfig fast-glob
pnpm add -D gitleaks @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── permission/          # Permission system core
│   ├── engine.ts        # Permission evaluation engine
│   ├── rules.ts         # Rule storage and matching
│   ├── prompts.ts       # User-facing approval flows
│   └── audit.ts         # Audit logging integration
├── validation/          # Input classification & validation
│   ├── schemas.ts       # Zod schemas for untrusted input
│   ├── classifier.ts    # Trusted vs untrusted source detection
│   └── sanitizer.ts     # Data sanitization before processing
├── egress/              # Data leak prevention
│   ├── scanner.ts       # Credential/PII pattern detection
│   ├── patterns.ts      # Detection rule definitions
│   └── filter.ts        # Egress filtering logic
├── monitoring/          # Token usage and alerts
│   ├── tracker.ts       # Token usage tracking
│   ├── alerts.ts        # Threshold-based alerting
│   └── budget.ts        # Budget management
└── config/              # Config management
    ├── loader.ts        # Cosmiconfig integration
    ├── schema.ts        # Config validation schemas
    └── defaults.ts      # Default config values
```

### Pattern 1: Hybrid Approval Flow with Rule Creation
**What:** First sensitive action requires explicit approval, then offer to create reusable rule
**When to use:** All file system writes, sensitive path reads, data egress
**Example:**
```typescript
// Source: OWASP ASI03 mitigation + permission prompt UX patterns
import { z } from 'zod';
import pino from 'pino';

const PermissionRuleSchema = z.object({
  action: z.enum(['fs.write', 'fs.read', 'egress']),
  pattern: z.string(), // glob pattern
  approved: z.boolean(),
  createdAt: z.string().datetime(),
  verbosity: z.enum(['minimal', 'detailed', 'custom'])
});

type PermissionRule = z.infer<typeof PermissionRuleSchema>;

interface ApprovalResponse {
  approved: boolean;
  createRule?: boolean;
  pattern?: string;
}

async function requestPermission(
  action: string,
  target: string,
  rules: PermissionRule[],
  logger: pino.Logger
): Promise<boolean> {
  // Check existing rules first
  const matchingRule = rules.find(r =>
    r.action === action &&
    minimatch(target, r.pattern)
  );

  if (matchingRule) {
    logger.info({ action, target, rule: matchingRule }, 'Permission auto-approved via rule');
    return matchingRule.approved;
  }

  // No rule found - prompt user with context
  const response = await promptUser({
    message: `Allow ${action} on ${target}?`,
    context: `This action requires permission to proceed.`,
    offerRuleCreation: true
  });

  // Log decision
  logger.warn({ action, target, approved: response.approved }, 'Permission decision made');

  // Create rule if requested
  if (response.createRule && response.pattern) {
    const newRule = PermissionRuleSchema.parse({
      action,
      pattern: response.pattern,
      approved: response.approved,
      createdAt: new Date().toISOString(),
      verbosity: 'minimal'
    });
    rules.push(newRule);
    await saveRules(rules);
  }

  return response.approved;
}
```

### Pattern 2: Trusted vs Untrusted Input Classification
**What:** Type-level distinction between validated and unvalidated data using branded types
**When to use:** At all trust boundaries - user commands vs external content
**Example:**
```typescript
// Source: TypeScript input validation best practices 2026
import { z } from 'zod';

// Branded type for trusted input
type TrustedInput = string & { __brand: 'trusted' };
type UntrustedInput = string & { __brand: 'untrusted' };

// Input sources
enum InputSource {
  USER_COMMAND = 'user_command',     // Direct user CLI input
  FILE_CONTENT = 'file_content',     // File system reads
  NETWORK = 'network',               // API responses, web fetches
  ENVIRONMENT = 'environment'        // ENV vars (may be untrusted)
}

const trustMap: Record<InputSource, boolean> = {
  [InputSource.USER_COMMAND]: true,
  [InputSource.FILE_CONTENT]: false,
  [InputSource.NETWORK]: false,
  [InputSource.ENVIRONMENT]: false
};

// Classify input by source
function classifyInput(input: string, source: InputSource): TrustedInput | UntrustedInput {
  const isTrusted = trustMap[source];

  if (isTrusted) {
    return input as TrustedInput;
  }

  return input as UntrustedInput;
}

// Sanitization promotes untrusted to trusted
function sanitize(input: UntrustedInput, schema: z.ZodSchema): TrustedInput {
  const validated = schema.parse(input);
  return validated as TrustedInput;
}

// Only trusted input allowed in sensitive operations
function executeCommand(command: TrustedInput): void {
  // Safe to execute - type system enforces validation
}
```

### Pattern 3: Egress Filtering with Pattern Detection
**What:** Scan all outbound data for credentials, API keys, PII before transmission
**When to use:** Before external API calls, file writes, network requests
**Example:**
```typescript
// Source: Gitleaks patterns + secret scanning best practices
import { execSync } from 'child_process';
import { z } from 'zod';

interface ScanResult {
  hasSecrets: boolean;
  findings: Array<{
    type: string;
    line: number;
    match: string; // Redacted version
  }>;
}

// High-entropy pattern detection (like TruffleHog)
function hasHighEntropy(str: string, threshold = 4.5): boolean {
  const charset = new Set(str);
  const entropy = [...charset].reduce((acc, char) => {
    const p = str.split(char).length / str.length;
    return acc - (p * Math.log2(p));
  }, 0);
  return entropy > threshold;
}

// Known secret patterns (subset - Gitleaks has 800+)
const SECRET_PATTERNS = [
  { name: 'AWS_KEY', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'GITHUB_TOKEN', pattern: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'PRIVATE_KEY', pattern: /-----BEGIN (RSA|OPENSSH) PRIVATE KEY-----/ },
  { name: 'JWT', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'EMAIL', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ }
];

async function scanForSecrets(data: string): Promise<ScanResult> {
  const findings: ScanResult['findings'] = [];

  // Pattern-based detection
  for (const { name, pattern } of SECRET_PATTERNS) {
    const matches = data.matchAll(new RegExp(pattern, 'g'));
    for (const match of matches) {
      findings.push({
        type: name,
        line: data.substring(0, match.index).split('\n').length,
        match: `${match[0].substring(0, 10)}...` // Redact
      });
    }
  }

  // Entropy-based detection
  const lines = data.split('\n');
  lines.forEach((line, idx) => {
    const tokens = line.split(/\s+/);
    tokens.forEach(token => {
      if (token.length > 20 && hasHighEntropy(token)) {
        findings.push({
          type: 'HIGH_ENTROPY',
          line: idx + 1,
          match: `${token.substring(0, 10)}...`
        });
      }
    });
  });

  return {
    hasSecrets: findings.length > 0,
    findings
  };
}

// Use Gitleaks for production (more comprehensive)
async function scanWithGitleaks(filePath: string): Promise<ScanResult> {
  try {
    execSync(`gitleaks detect --source ${filePath} --no-git --report-format json`, {
      encoding: 'utf8'
    });
    return { hasSecrets: false, findings: [] };
  } catch (error) {
    // Gitleaks exits 1 when secrets found
    // Parse JSON output for findings
    return { hasSecrets: true, findings: [] }; // Parse actual results
  }
}
```

### Pattern 4: Token Usage Monitoring with Tiered Alerts
**What:** Track token consumption, alert at 50%, 80%, 100% thresholds
**When to use:** All LLM API calls
**Example:**
```typescript
// Source: LLM observability best practices 2026
import pino from 'pino';

interface TokenBudget {
  limit: number;
  used: number;
  period: 'daily' | 'weekly' | 'monthly';
  alertThresholds: number[]; // [0.5, 0.8, 1.0]
}

interface TokenUsageEvent {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: string;
}

class TokenMonitor {
  private budget: TokenBudget;
  private alertedThresholds: Set<number> = new Set();
  private logger: pino.Logger;

  constructor(budget: TokenBudget, logger: pino.Logger) {
    this.budget = budget;
    this.logger = logger;
  }

  track(event: TokenUsageEvent): void {
    this.budget.used += event.totalTokens;

    const usage = this.budget.used / this.budget.limit;

    // Check thresholds
    for (const threshold of this.budget.alertThresholds) {
      if (usage >= threshold && !this.alertedThresholds.has(threshold)) {
        this.alert(threshold, usage);
        this.alertedThresholds.add(threshold);
      }
    }

    // Log all usage
    this.logger.info({
      ...event,
      budgetUsage: usage,
      budgetRemaining: this.budget.limit - this.budget.used
    }, 'Token usage tracked');
  }

  private alert(threshold: number, actual: number): void {
    const severity = threshold >= 1.0 ? 'critical' : threshold >= 0.8 ? 'warning' : 'info';

    this.logger[severity]({
      threshold,
      actual,
      budgetLimit: this.budget.limit,
      budgetUsed: this.budget.used
    }, `Token budget threshold exceeded: ${threshold * 100}%`);

    // Could integrate with notification system
    if (threshold >= 0.8) {
      console.error(`⚠️ Token budget at ${Math.round(actual * 100)}%`);
    }
  }

  reset(): void {
    this.budget.used = 0;
    this.alertedThresholds.clear();
  }
}
```

### Anti-Patterns to Avoid
- **TypeScript types alone for security:** Types erased at runtime - MUST validate with Zod at trust boundaries (ASI01)
- **Storing secrets in logs:** Never log credentials, even redacted. Use structured logging with field filtering (audit logging best practice)
- **Over-privileged tool access:** Don't grant wildcard permissions (`*`) in production. Use narrowest scopes (OWASP ASI03)
- **Client-side validation only:** Always validate server-side/runtime - client validation easily bypassed (TypeScript security 2026)
- **Node.js permission model in isolation:** Symlink vulnerabilities exist (CVE-2026-*). Layer with custom validation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret detection | Custom regex for API keys | Gitleaks or TruffleHog | 800+ secret types, entropy detection, active maintenance for new patterns. Custom regex misses variations |
| Runtime validation | Manual type checks | Zod schemas | Type inference, composability, clear error messages. Manual checks verbose and error-prone |
| Glob pattern matching | Custom path wildcards | fast-glob or minimatch | Edge cases (symlinks, . files, escaping). Battle-tested across ecosystem |
| Structured logging | console.log wrappers | Pino | Performance (async I/O), structured JSON, log levels, child loggers. Console wrappers block event loop |
| Config file discovery | Hardcoded paths | cosmiconfig | Convention-based search (.rc files, package.json), multiple formats (JSON, YAML, TS) |
| Input sanitization | String replacement | Zod .transform() | Type-safe transformations, validation + sanitization in one. String ops miss edge cases |

**Key insight:** Security tooling has maturity in 2026 - custom solutions miss patterns discovered through years of vulnerability reports. Library ecosystems (Gitleaks, Zod) updated faster than internal implementations can track new threats.

## Common Pitfalls

### Pitfall 1: Node.js Permission Model Symlink Bypass
**What goes wrong:** Granted paths can be escaped using crafted relative symlink paths. A script allowed to read current directory can read `/etc/passwd` via symlinks
**Why it happens:** Fixed in Node.js January 2026 security release, but requires v23.5+/v22.13+. Older versions vulnerable (CVE-2026-*)
**How to avoid:**
- Require Node.js v23.5.0+ or v22.13.0+ minimum
- Don't rely on permission model alone for security-critical isolation
- Layer with explicit path validation before fs operations
- Use `fs.realpath()` to resolve symlinks before permission checks
**Warning signs:** Using `--allow-fs-read` with older Node versions, permission bypasses in testing

### Pitfall 2: Treating TypeScript Types as Runtime Security
**What goes wrong:** Assuming `TrustedInput` type means data is safe at runtime. Attacker sends malicious payload that bypasses compile-time checks
**Why it happens:** TypeScript types erased at runtime. No actual validation occurs
**How to avoid:**
- Always pair branded types with Zod schemas
- Validate at EVERY trust boundary (user input, file reads, network)
- Use `safeParse()` instead of `parse()` to handle errors gracefully
- Review trust boundaries explicitly in code review
**Warning signs:** Casting to branded types without validation, missing Zod checks at boundaries

### Pitfall 3: False Negative Bias in Secret Scanning
**What goes wrong:** Using only pattern-based detection (regex) misses secrets that don't match known formats (custom API keys, internal tokens)
**Why it happens:** Optimizing for precision (low false positives) over recall (catching all secrets). detect-secrets philosophy
**How to avoid:**
- Combine pattern-based (Gitleaks) with entropy-based (TruffleHog) detection
- Set entropy threshold around 4.5+ for high-randomness strings
- Use TruffleHog verification feature to confirm if leaked credentials still active
- Review high-entropy findings manually rather than dismissing as false positives
**Warning signs:** "Clean" scan results but obvious base64 strings, low entropy thresholds (<4.0), dismissing unknown patterns

### Pitfall 4: Permission Prompt Fatigue
**What goes wrong:** User approves dangerous action without reading because they're asked too frequently
**Why it happens:** Prompting for every granular action instead of creating rules
**How to avoid:**
- Implement hybrid approval flow - offer rule creation after first approval
- Group related actions (e.g., all writes to `/tmp/*`)
- Use contextual timing - prompt when benefit obvious, not preemptively
- Provide clear value explanation in prompt ("Allow write to save your work?")
- Make it easy to revoke/edit rules later (don't hide in settings)
**Warning signs:** User always clicking "yes" without reading, complaints about interruptions

### Pitfall 5: Logging Sensitive Data in Audit Trails
**What goes wrong:** Audit logs contain the very secrets/PII you're trying to protect. Attacker gains log access, exfiltrates credentials
**Why it happens:** Logging raw input/output for debugging without filtering
**How to avoid:**
- Use Pino's serializer feature to redact fields automatically
- Never log: passwords, tokens, API keys, PII (SSN, email in full)
- Log redacted versions: `api_key: "sk_...xyz"` (first 3, last 3 chars)
- Review log output in dev/staging before production
- Set up log access controls separate from application permissions
**Warning signs:** Seeing full credentials in log files, no redaction strategy, log files in `.gitignore` (implies sensitive data)

### Pitfall 6: Blocking Operations in Approval Prompts
**What goes wrong:** Permission prompt uses synchronous I/O, blocks event loop. Other requests timeout
**Why it happens:** Using readline `questionAsync` or blocking on user input in single-threaded Node.js
**How to avoid:**
- Use non-blocking prompt libraries (inquirer with async/await)
- Consider timeout fallback (auto-deny after 30s)
- Queue permission requests if multiple concurrent
- Document that permission mode expects interactive use (not for batch jobs)
**Warning signs:** Server unresponsive during prompts, timeout errors in other requests

## Code Examples

Verified patterns from official sources:

### Zod Schema for Permission Rule Validation
```typescript
// Source: https://zod.dev - Basic usage + schema composition
import { z } from 'zod';

const PermissionActionSchema = z.enum([
  'fs.read',
  'fs.write',
  'fs.delete',
  'egress.network',
  'egress.file'
]);

const PathPatternSchema = z.string()
  .min(1)
  .refine(
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

const VerbositySchema = z.enum(['minimal', 'detailed', 'custom']);

const PermissionRuleSchema = z.object({
  id: z.string().uuid().optional(), // Generated
  action: PermissionActionSchema,
  pattern: PathPatternSchema,
  approved: z.boolean(),
  verbosity: VerbositySchema.default('minimal'),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional()
});

const PermissionConfigSchema = z.object({
  version: z.literal('1.0'),
  mode: z.enum(['strict', 'permissive']).default('strict'),
  rules: z.array(PermissionRuleSchema),
  audit: z.object({
    enabled: z.boolean().default(true),
    logPath: z.string().optional()
  })
});

type PermissionConfig = z.infer<typeof PermissionConfigSchema>;

// Usage
function validateConfig(rawConfig: unknown): PermissionConfig {
  return PermissionConfigSchema.parse(rawConfig);
}

// With error handling
function validateConfigSafe(rawConfig: unknown) {
  const result = PermissionConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Config validation failed:', result.error.format());
    return null;
  }

  return result.data;
}
```

### Cosmiconfig Setup for Permission Rules
```typescript
// Source: https://github.com/cosmiconfig/cosmiconfig - Basic usage
import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

const moduleName = 'vec-permissions';

async function loadPermissionConfig(): Promise<PermissionConfig> {
  const explorer = cosmiconfig(moduleName, {
    searchPlaces: [
      'package.json',
      `.${moduleName}rc`,
      `.${moduleName}rc.json`,
      `.${moduleName}rc.yaml`,
      `.${moduleName}rc.yml`,
      `.${moduleName}rc.js`,
      `.${moduleName}rc.cjs`,
      `.${moduleName}.config.js`,
      `.${moduleName}.config.cjs`
    ]
  });

  const result = await explorer.search();

  if (!result || result.isEmpty) {
    // Return default config
    return PermissionConfigSchema.parse({
      version: '1.0',
      mode: 'strict',
      rules: [],
      audit: { enabled: true }
    });
  }

  // Validate loaded config
  return PermissionConfigSchema.parse(result.config);
}

async function savePermissionConfig(config: PermissionConfig): Promise<void> {
  const explorer = cosmiconfig(moduleName);
  const result = await explorer.search();

  const configPath = result?.filepath || `.${moduleName}rc.json`;

  await fs.writeFile(
    configPath,
    JSON.stringify(config, null, 2),
    'utf8'
  );
}
```

### Pino Logger Setup with Sensitive Field Redaction
```typescript
// Source: https://github.com/pinojs/pino - Redaction documentation
import pino from 'pino';

const logger = pino({
  level: 'info',
  // Redact sensitive fields automatically
  redact: {
    paths: [
      'password',
      'apiKey',
      'api_key',
      'token',
      'access_token',
      'refresh_token',
      'authorization',
      'cookie',
      'secret',
      '*.password',
      '*.apiKey',
      'req.headers.authorization',
      'req.headers.cookie'
    ],
    censor: '[REDACTED]'
  },
  serializers: {
    // Custom serializers for complex objects
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  },
  // Pretty print in dev, JSON in prod
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined
});

// Usage with audit trail
function auditPermissionDecision(
  action: string,
  target: string,
  approved: boolean,
  userId?: string
) {
  logger.warn({
    audit: true,
    eventType: 'permission_decision',
    action,
    target,
    approved,
    userId, // Safe to log - not sensitive
    timestamp: new Date().toISOString()
  }, `Permission ${approved ? 'granted' : 'denied'} for ${action} on ${target}`);
}

// Child loggers for context
const permissionLogger = logger.child({ component: 'permission-system' });
const egressLogger = logger.child({ component: 'egress-filter' });

export { logger, permissionLogger, egressLogger };
```

### Node.js Permission Model Runtime Checks
```typescript
// Source: https://nodejs.org/api/permissions.html - process.permission API
import * as fs from 'fs';
import * as path from 'path';

function checkFilePermission(
  filePath: string,
  operation: 'read' | 'write'
): boolean {
  if (!process.permission) {
    // Permission model not enabled
    return true;
  }

  const scope = operation === 'read' ? 'fs.read' : 'fs.write';
  const absPath = path.resolve(filePath);

  // Check if permission granted
  const hasPermission = process.permission.has(scope, absPath);

  if (!hasPermission) {
    throw new Error(
      `Permission denied: ${operation} access to ${absPath} not granted. ` +
      `Start with --allow-fs-${operation}=${absPath}`
    );
  }

  return true;
}

// Safe wrapper around fs operations
export async function safeReadFile(filePath: string): Promise<string> {
  checkFilePermission(filePath, 'read');

  // Additional check: resolve symlinks
  const realPath = fs.realpathSync(filePath);
  checkFilePermission(realPath, 'read');

  return fs.promises.readFile(realPath, 'utf8');
}

export async function safeWriteFile(
  filePath: string,
  content: string
): Promise<void> {
  checkFilePermission(filePath, 'write');

  const realPath = fs.realpathSync(filePath);
  checkFilePermission(realPath, 'write');

  await fs.promises.writeFile(realPath, content, 'utf8');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual type checks | Zod runtime validation | Stable since ~2020, mainstream 2024+ | Type safety + runtime checks unified. Eliminated entire class of trust boundary bugs |
| Node.js experimental `--experimental-permission` | Stable `--allow-fs-read/write` | v23.5.0 (Jan 2026) | Production-ready file system sandboxing. Still requires symlink awareness |
| Winston logging | Pino for performance-critical paths | Performance gap widened 2024-2026 | 5x faster enables fine-grained audit logging without perf impact |
| Pattern-only secret scanning | Hybrid pattern + entropy | TruffleHog added verification ~2023-2024 | Better recall (find more secrets) + verification reduces false alarm fatigue |
| Pre-prompt permission requests | Contextual + hybrid approval | UX research 2024-2026 | 40% higher approval rates when context provided. Reduces prompt fatigue |
| Generic RBAC libraries | OWASP Top 10 Agentic Apps framework | Released Dec 2025 | First industry-wide standard for AI agent security. Identifies ASI03 (identity/privilege) as critical |

**Deprecated/outdated:**
- **accesscontrol (npm):** Last updated 2018, doesn't address AI agent-specific risks. Use custom implementation based on OWASP ASI patterns
- **detect-secrets:** Falls behind on recall vs Gitleaks/TruffleHog in 2026 benchmarks. Still valid for low-false-positive environments
- **Node.js < v22.13.0:** Contains permission model symlink vulnerabilities (CVE-2026-*). Upgrade mandatory for security-critical use

## Open Questions

Things that couldn't be fully resolved:

1. **OWASP Top 10 Agentic Apps - Detailed Mitigation Patterns**
   - What we know: 10 risks identified (ASI01-ASI10), high-level mitigations listed
   - What's unclear: Specific implementation patterns for ASI06 (Memory Poisoning), ASI07 (Inter-Agent Communication), ASI10 (Rogue Agents) not yet detailed in public docs
   - Recommendation: Implement ASI01-ASI03 (highest priority per research) initially. Revisit OWASP docs in 30-60 days as community best practices emerge

2. **Node.js Permission Model - Production Stability at Scale**
   - What we know: Stable as of v23.5.0, recent security fixes (symlink bypass)
   - What's unclear: Performance characteristics under high permission check volume, behavior with Worker threads (docs note: "does not inherit")
   - Recommendation: Prototype with permission model, but include fallback to custom fs wrapper if perf issues emerge. Benchmark early

3. **Secret Verification Trade-offs (TruffleHog)**
   - What we know: TruffleHog can verify if credentials still active (800+ types)
   - What's unclear: Network latency impact, rate limiting by providers, whether verification alerts credential owners
   - Recommendation: Use verification in CI/pre-commit, but not in real-time egress filtering (latency risk). Pattern detection sufficient for egress

4. **Permission Prompt UX - CLI vs IDE Context**
   - What we know: UX patterns for web/mobile (contextual timing, clear value prop)
   - What's unclear: Best practices for CLI tools vs IDE extensions differ. CLI interrupts workflow differently
   - Recommendation: Start with minimal verbosity + rule creation offer. A/B test with early users for CLI-specific UX feedback

## Sources

### Primary (HIGH confidence)
- [Node.js v25.6.0 Permission Model Documentation](https://nodejs.org/api/permissions.html) - Stable API, flag usage, runtime checks
- [Zod Official Documentation](https://zod.dev) - Installation, schema composition, TypeScript integration
- [TruffleHog GitHub Repository](https://github.com/trufflesecurity/trufflehog) - Installation, verification capabilities, 800+ secret types
- [Gitleaks GitHub Repository](https://github.com/gitleaks/gitleaks) - Installation, pattern detection, usage modes
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) - Official framework, ASI01-ASI10 risks

### Secondary (MEDIUM confidence)
- [Node.js January 2026 Security Release - NodeSource](https://nodesource.com/blog/nodejs-security-release-january-2026) - Symlink vulnerabilities, version requirements
- [Pino vs Winston Comparison - Better Stack](https://betterstack.com/community/comparisons/pino-vs-winston/) - Performance benchmarks, feature comparison (2026 sources)
- [TypeScript Secure Coding - Aptori](https://www.aptori.com/blog/secure-coding-in-typescript-best-practices-to-build-secure-applications) - Input validation patterns, trust boundaries
- [Permission Prompt UX Patterns - UserOnboard](https://www.useronboard.com/onboarding-ux-patterns/permission-priming/) - Contextual timing, approval flow patterns
- [LLM Token Usage Monitoring - LangWatch](https://langwatch.ai/blog/4-best-tools-for-monitoring-llm-agentapplications-in-2026) - Alert thresholds, monitoring best practices
- [TruffleHog vs Gitleaks Comparison - Jit](https://www.jit.io/resources/appsec-tools/trufflehog-vs-gitleaks-a-detailed-comparison-of-secret-scanning-tools) - Performance, detection approach comparison
- [cosmiconfig GitHub Repository](https://github.com/cosmiconfig/cosmiconfig) - Config discovery patterns, search locations

### Tertiary (LOW confidence)
- [AI Agent Security Enterprise Guide - MintMCP Blog](https://www.mintmcp.com/blog/ai-agent-security) - General AI agent security trends
- [Sensitive Data Scanning Tools - Strac](https://www.strac.io/blog/top-10-data-scanning-tools) - PII detection approaches
- Various Medium/DEV.to articles on TypeScript security patterns - Community perspectives, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zod, Pino, Gitleaks verified through official docs and Context7. Node.js permission model stable v23.5+
- Architecture: MEDIUM - Patterns derived from OWASP ASI framework + UX research, but limited production examples for AI agents specifically
- Pitfalls: MEDIUM - Node.js CVE verified through official security release. Other pitfalls inferred from general security best practices + 2026 sources
- OWASP ASI detailed implementations: LOW - Framework released Dec 2025, detailed mitigation patterns still emerging in community

**Research date:** 2026-02-06
**Valid until:** ~2026-03-06 (30 days) - AI agent security landscape rapidly evolving. Node.js permission model stable but new CVEs possible. Recommend refresh if planning delayed beyond 30 days.
