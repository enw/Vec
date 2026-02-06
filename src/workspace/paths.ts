import { xdgData } from 'xdg-basedir';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function getDataDir(): string {
  const dataHome = xdgData || join(homedir(), '.local', 'share');
  return join(dataHome, 'vec');
}

export function getWorkspacesDir(): string {
  return join(getDataDir(), 'workspaces');
}

export function getWorkspacePath(name: string): string {
  return join(getWorkspacesDir(), name);
}

export function getMetadataPath(): string {
  return join(getWorkspacesDir(), '.metadata.json');
}
