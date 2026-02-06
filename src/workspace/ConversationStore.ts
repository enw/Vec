import { appendFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Message } from './types.js';

export class ConversationStore {
  private conversationPath: string;

  constructor(workspacePath: string) {
    this.conversationPath = join(workspacePath, 'conversation.jsonl');
  }

  async append(message: Message): Promise<void> {
    const line = JSON.stringify(message) + '\n';
    await appendFile(this.conversationPath, line, 'utf-8');
  }

  async loadAll(): Promise<Message[]> {
    try {
      const content = await readFile(this.conversationPath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => JSON.parse(line) as Message);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  async clear(): Promise<void> {
    try {
      await unlink(this.conversationPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return; // Already doesn't exist
      }
      throw err;
    }
  }
}
