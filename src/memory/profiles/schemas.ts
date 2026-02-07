import { z } from 'zod';

// Profile type union
export type ProfileType = 'soul' | 'agents' | 'user' | 'identity' | 'heartbeat';

// Profile scope mapping (global vs workspace)
export const PROFILE_SCOPE: Record<ProfileType, 'global' | 'workspace'> = {
  soul: 'workspace',
  agents: 'workspace',
  user: 'global',
  identity: 'global',
  heartbeat: 'workspace'
};

// Profile filename mapping
export const PROFILE_FILENAME: Record<ProfileType, string> = {
  soul: 'SOUL.md',
  agents: 'AGENTS.md',
  user: 'USER.md',
  identity: 'IDENTITY.md',
  heartbeat: 'HEARTBEAT.md'
};

// SOUL.md schema (per-workspace)
export const SoulProfileSchema = z.object({
  schema: z.literal('v1'),
  personality: z.string(),
  communication_style: z.string(),
  behavior_traits: z.array(z.string())
});

export type SoulProfile = z.infer<typeof SoulProfileSchema>;

// AGENTS.md schema (per-workspace)
export const AgentsProfileSchema = z.object({
  schema: z.literal('v1'),
  agents: z.array(z.object({
    name: z.string(),
    role: z.string(),
    capabilities: z.array(z.string())
  }))
});

export type AgentsProfile = z.infer<typeof AgentsProfileSchema>;

// USER.md schema (global)
export const UserProfileSchema = z.object({
  schema: z.literal('v1'),
  technical: z.object({
    languages: z.array(z.string()),
    tools: z.array(z.string()),
    patterns: z.array(z.string())
  }),
  work_style: z.object({
    communication: z.string(),
    explanation_depth: z.string()
  })
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// IDENTITY.md schema (global)
export const IdentityProfileSchema = z.object({
  schema: z.literal('v1'),
  name: z.string(),
  context: z.string()
});

export type IdentityProfile = z.infer<typeof IdentityProfileSchema>;

// HEARTBEAT.md schema (per-workspace)
export const HeartbeatProfileSchema = z.object({
  schema: z.literal('v1'),
  status: z.enum(['idle', 'active', 'completed']),
  current_task: z.string().optional(),
  started_at: z.string().optional(),
  last_checkin: z.string().optional()
});

export type HeartbeatProfile = z.infer<typeof HeartbeatProfileSchema>;

// Schema map for validation
export const PROFILE_SCHEMAS = {
  soul: SoulProfileSchema,
  agents: AgentsProfileSchema,
  user: UserProfileSchema,
  identity: IdentityProfileSchema,
  heartbeat: HeartbeatProfileSchema
} as const;
