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

export function getGlobalProfilesDir(): string {
  return join(getDataDir(), 'profiles');
}

export function getGlobalProfilePath(filename: string): string {
  return join(getGlobalProfilesDir(), filename);
}

export function getWorkspaceProfilePath(workspaceName: string, filename: string): string {
  return join(getWorkspacePath(workspaceName), filename);
}
