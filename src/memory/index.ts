// ProfileManager
export { ProfileManager } from './ProfileManager.js';
export type { ProfileResult, ValidationResult, ProfileManagerOptions } from './ProfileManager.js';

// Schemas and types
export {
  ProfileType,
  PROFILE_SCOPE,
  PROFILE_FILENAME,
  PROFILE_SCHEMAS,
  SoulProfileSchema,
  AgentsProfileSchema,
  UserProfileSchema,
  IdentityProfileSchema,
  HeartbeatProfileSchema
} from './profiles/schemas.js';

export type {
  SoulProfile,
  AgentsProfile,
  UserProfile,
  IdentityProfile,
  HeartbeatProfile
} from './profiles/schemas.js';
