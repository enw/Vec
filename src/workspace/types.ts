export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  cancelled?: boolean;
}

export interface WorkspaceInfo {
  name: string;
  path: string;
  createdAt: number;
  lastActiveAt: number;
}

export interface WorkspacesMetadata {
  lastActive: string | null;  // workspace name
  lastNumbered: number;        // counter for auto-increment
}
