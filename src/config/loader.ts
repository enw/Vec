/**
 * Configuration loading and saving via cosmiconfig
 */

import { cosmiconfig } from 'cosmiconfig';
import { writeFile } from 'fs/promises';
import { DEFAULT_CONFIG } from './defaults.js';
import { PermissionConfigSchema, type PermissionConfig } from './schema.js';

const MODULE_NAME = 'vec-permissions';

/**
 * Load configuration from disk or return defaults
 */
export async function loadConfig(): Promise<PermissionConfig> {
  try {
    const explorer = cosmiconfig(MODULE_NAME);
    const result = await explorer.search();

    if (!result || result.isEmpty) {
      return DEFAULT_CONFIG;
    }

    // Validate loaded config with Zod
    return PermissionConfigSchema.parse(result.config);
  } catch (error) {
    console.error('Config loading failed, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to disk
 */
export async function saveConfig(config: PermissionConfig): Promise<void> {
  try {
    // Validate before saving
    const validated = PermissionConfigSchema.parse(config);

    // Write to standard location
    const configPath = `.${MODULE_NAME}rc.json`;
    await writeFile(configPath, JSON.stringify(validated, null, 2), 'utf8');
  } catch (error) {
    console.error('Config save failed:', error);
    throw error;
  }
}
