import lock from 'proper-lockfile';
import writeFileAtomic from 'write-file-atomic';
import matter from 'gray-matter';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGlobalProfilePath, getWorkspaceProfilePath, getGlobalProfilesDir } from '../workspace/paths.js';
import {
  ProfileType,
  PROFILE_SCOPE,
  PROFILE_FILENAME,
  PROFILE_SCHEMAS,
  SoulProfile,
  AgentsProfile,
  UserProfile,
  IdentityProfile,
  HeartbeatProfile
} from './profiles/schemas.js';

// Union type for all profile data types
type ProfileData = SoulProfile | AgentsProfile | UserProfile | IdentityProfile | HeartbeatProfile;

export interface ProfileResult<T> {
  data: T;
  content: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ProfileManagerOptions {
  dataDir?: string;
}

export class ProfileManager {
  private dataDir?: string;

  constructor(options?: ProfileManagerOptions) {
    this.dataDir = options?.dataDir;
  }

  private getProfilePath(type: ProfileType, workspaceName?: string): string {
    const filename = PROFILE_FILENAME[type];
    const scope = PROFILE_SCOPE[type];

    if (scope === 'global') {
      return getGlobalProfilePath(filename);
    } else {
      if (!workspaceName) {
        throw new Error(`Workspace name required for ${type} profile`);
      }
      return getWorkspaceProfilePath(workspaceName, filename);
    }
  }

  private async getTemplatePath(type: ProfileType): Promise<string> {
    const filename = PROFILE_FILENAME[type];
    // Use import.meta.url to resolve relative to this source file
    const currentDir = dirname(fileURLToPath(import.meta.url));
    return join(currentDir, 'profiles', 'templates', filename);
  }

  async ensureProfile(type: ProfileType, workspaceName?: string): Promise<void> {
    const profilePath = this.getProfilePath(type, workspaceName);

    // Check if file exists
    try {
      await readFile(profilePath, 'utf-8');
      return; // File exists, nothing to do
    } catch {
      // File doesn't exist, create from template
    }

    // Ensure parent directory exists
    await mkdir(dirname(profilePath), { recursive: true });

    // Load template
    const templatePath = await this.getTemplatePath(type);
    const templateContent = await readFile(templatePath, 'utf-8');

    // Write atomically
    await writeFileAtomic(profilePath, templateContent, 'utf-8');
  }

  async loadProfile<T extends ProfileData>(
    type: ProfileType,
    workspaceName?: string
  ): Promise<ProfileResult<T>> {
    const profilePath = this.getProfilePath(type, workspaceName);
    const content = await readFile(profilePath, 'utf-8');

    // Parse with gray-matter
    const { data, content: body } = matter(content);

    // Validate with appropriate Zod schema
    const schema = PROFILE_SCHEMAS[type];
    const validated = schema.parse(data) as T;

    return {
      data: validated,
      content: body
    };
  }

  async saveProfile(
    type: ProfileType,
    data: Record<string, unknown>,
    content: string,
    workspaceName?: string
  ): Promise<void> {
    const profilePath = this.getProfilePath(type, workspaceName);
    const lockPath = dirname(profilePath);

    // Acquire lock on parent directory
    const release = await lock.lock(lockPath, {
      stale: 10000,
      update: 2000,
      retries: {
        retries: 5,
        minTimeout: 100
      }
    });

    try {
      // Serialize with gray-matter
      const serialized = matter.stringify(content, data);

      // Write atomically
      await writeFileAtomic(profilePath, serialized, 'utf-8');
    } finally {
      await release();
    }
  }

  async ensureAllProfiles(workspaceName: string): Promise<void> {
    // Create global profiles
    await this.ensureProfile('user');
    await this.ensureProfile('identity');

    // Create workspace profiles
    await this.ensureProfile('soul', workspaceName);
    await this.ensureProfile('agents', workspaceName);
    await this.ensureProfile('heartbeat', workspaceName);
  }

  async validateProfile(type: ProfileType, workspaceName?: string): Promise<ValidationResult> {
    try {
      await this.loadProfile(type, workspaceName);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
