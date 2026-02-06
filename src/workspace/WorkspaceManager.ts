import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { getDataDir, getWorkspacesDir, getWorkspacePath, getMetadataPath } from './paths.js';
import { validateWorkspaceName } from './validate.js';
import { ConversationStore } from './ConversationStore.js';
import type { WorkspaceInfo, WorkspacesMetadata } from './types.js';

export class WorkspaceManager {
  private workspacesDir: string;
  private metadataPath: string;

  constructor(options?: { dataDir?: string }) {
    const dataDir = options?.dataDir || getDataDir();
    this.workspacesDir = join(dataDir, 'workspaces');
    this.metadataPath = join(this.workspacesDir, '.metadata.json');
  }

  async ensureDirectories(): Promise<void> {
    await mkdir(this.workspacesDir, { recursive: true });
  }

  async create(name: string): Promise<WorkspaceInfo> {
    const validation = validateWorkspaceName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const workspacePath = join(this.workspacesDir, validation.sanitized);
    await mkdir(workspacePath, { recursive: true });

    const now = Date.now();
    const info: WorkspaceInfo = {
      name: validation.sanitized,
      path: workspacePath,
      createdAt: now,
      lastActiveAt: now,
    };

    return info;
  }

  async createNumbered(): Promise<WorkspaceInfo> {
    await this.ensureDirectories();

    const metadata = await this.readMetadata();
    const nextNumber = metadata.lastNumbered + 1;
    const name = `workspace-${nextNumber}`;

    const info = await this.create(name);

    // Update metadata with new lastNumbered
    metadata.lastNumbered = nextNumber;
    await this.writeMetadata(metadata);

    return info;
  }

  async load(name: string): Promise<{ info: WorkspaceInfo; store: ConversationStore }> {
    const workspacePath = join(this.workspacesDir, name);

    let stats;
    try {
      stats = await stat(workspacePath);
      if (!stats.isDirectory()) {
        throw new Error(`Workspace "${name}" is not a directory`);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Workspace "${name}" does not exist`);
      }
      throw err;
    }

    const info: WorkspaceInfo = {
      name,
      path: workspacePath,
      createdAt: stats.birthtimeMs || Date.now(),
      lastActiveAt: Date.now(),
    };

    const store = new ConversationStore(workspacePath);

    return { info, store };
  }

  async getOrCreate(name: string): Promise<{ info: WorkspaceInfo; store: ConversationStore }> {
    try {
      const result = await this.load(name);
      // Update lastActive
      await this.setLastActive(name);
      return result;
    } catch (err) {
      if ((err as Error).message.includes('does not exist')) {
        const info = await this.create(name);
        const store = new ConversationStore(info.path);
        await this.setLastActive(name);
        return { info, store };
      }
      throw err;
    }
  }

  async getLastActive(): Promise<string | null> {
    const metadata = await this.readMetadata();
    return metadata.lastActive;
  }

  async setLastActive(name: string): Promise<void> {
    const metadata = await this.readMetadata();
    metadata.lastActive = name;
    await this.writeMetadata(metadata);
  }

  async list(): Promise<WorkspaceInfo[]> {
    await this.ensureDirectories();

    try {
      const entries = await readdir(this.workspacesDir, { withFileTypes: true });
      const workspaces: WorkspaceInfo[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const workspacePath = join(this.workspacesDir, entry.name);
          const stats = await stat(workspacePath);

          workspaces.push({
            name: entry.name,
            path: workspacePath,
            createdAt: stats.birthtimeMs || Date.now(),
            lastActiveAt: stats.mtimeMs || Date.now(),
          });
        }
      }

      return workspaces;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  private async readMetadata(): Promise<WorkspacesMetadata> {
    try {
      const content = await readFile(this.metadataPath, 'utf-8');
      return JSON.parse(content) as WorkspacesMetadata;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { lastActive: null, lastNumbered: 0 };
      }
      throw err;
    }
  }

  private async writeMetadata(metadata: WorkspacesMetadata): Promise<void> {
    await this.ensureDirectories();
    await writeFile(this.metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }
}
