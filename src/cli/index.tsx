#!/usr/bin/env node
import meow from 'meow';
import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { WorkspaceManager } from '../workspace/index.js';

const cli = meow(`
  Usage
    $ vec [options]

  Options
    -w, --workspace <name>  Create or switch to named workspace
    -w, --workspace         Create numbered workspace (auto-increment)
    --version               Show version
    --help                  Show help
`, {
  importMeta: import.meta,
  flags: {
    workspace: {
      type: 'string',
      shortFlag: 'w',
    },
  },
});

async function main() {
  try {
    const manager = new WorkspaceManager();
    await manager.ensureDirectories();

    let workspaceName: string;
    let workspacePath: string;

    // Workspace resolution logic
    if (cli.flags.workspace !== undefined && cli.flags.workspace !== '') {
      // -w some-name: use that name
      const { info } = await manager.getOrCreate(cli.flags.workspace);
      workspaceName = info.name;
      workspacePath = info.path;
    } else if (cli.flags.workspace === '') {
      // -w without value: create numbered workspace
      const { info } = await manager.getOrCreate((await manager.createNumbered()).name);
      workspaceName = info.name;
      workspacePath = info.path;
    } else {
      // No flag: getLastActive, fallback to createNumbered
      const lastActive = await manager.getLastActive();
      if (lastActive) {
        const { info } = await manager.getOrCreate(lastActive);
        workspaceName = info.name;
        workspacePath = info.path;
      } else {
        const { info } = await manager.getOrCreate((await manager.createNumbered()).name);
        workspaceName = info.name;
        workspacePath = info.path;
      }
    }

    render(<App workspaceName={workspaceName} workspacePath={workspacePath} />);
  } catch (err) {
    console.error('Error:', (err as Error).message);
    process.exit(1);
  }
}

main();
