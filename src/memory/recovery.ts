import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { ProfileManager } from './ProfileManager.js';
import { PROFILE_FILENAME, PROFILE_SCOPE, type ProfileType } from './profiles/schemas.js';

export interface RecoveryResult {
  repaired: string[];
}

/**
 * Validates and repairs all workspace-specific profiles and conversation.jsonl
 */
export async function validateAndRepairWorkspace(
  workspacePath: string,
  profileManager: ProfileManager
): Promise<RecoveryResult> {
  const repaired: string[] = [];
  const workspaceName = workspacePath.split('/').pop() || '';

  // Validate workspace-specific profiles
  const workspaceProfileTypes: ProfileType[] = ['soul', 'agents', 'heartbeat'];

  for (const type of workspaceProfileTypes) {
    const validation = await profileManager.validateProfile(type, workspaceName);

    if (!validation.valid) {
      // Try to repair by re-parsing
      const filename = PROFILE_FILENAME[type];
      const profilePath = join(workspacePath, filename);

      let needsRecreate = false;

      try {
        const content = await readFile(profilePath, 'utf-8');
        matter(content); // Attempt to parse YAML
      } catch {
        // YAML malformed, needs recreation
        needsRecreate = true;
      }

      if (needsRecreate) {
        // Recreate from template
        await profileManager.ensureProfile(type, workspaceName);
        repaired.push(`${filename} (recreated from template)`);
      }
    }
  }

  // Validate conversation.jsonl
  const conversationPath = join(workspacePath, 'conversation.jsonl');
  try {
    const content = await readFile(conversationPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    let corruptedCount = 0;

    for (const line of lines) {
      try {
        JSON.parse(line);
      } catch {
        corruptedCount++;
        console.warn(`Skipped corrupted line in conversation.jsonl: ${line.substring(0, 50)}...`);
      }
    }

    if (corruptedCount > 0) {
      repaired.push(`conversation.jsonl (${corruptedCount} corrupted lines skipped)`);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
    // File doesn't exist yet, that's fine
  }

  return { repaired };
}

/**
 * Validates and repairs global profiles (USER.md, IDENTITY.md)
 */
export async function validateGlobalProfiles(
  profileManager: ProfileManager
): Promise<RecoveryResult> {
  const repaired: string[] = [];
  const globalProfileTypes: ProfileType[] = ['user', 'identity'];

  for (const type of globalProfileTypes) {
    const validation = await profileManager.validateProfile(type);

    if (!validation.valid) {
      // Try to repair by re-parsing
      const filename = PROFILE_FILENAME[type];

      let needsRecreate = false;

      try {
        // validateProfile already tried to load, if it failed it's malformed
        needsRecreate = true;
      } catch {
        needsRecreate = true;
      }

      if (needsRecreate) {
        // Recreate from template
        await profileManager.ensureProfile(type);
        repaired.push(`${filename} (recreated from template)`);
      }
    }
  }

  return { repaired };
}
