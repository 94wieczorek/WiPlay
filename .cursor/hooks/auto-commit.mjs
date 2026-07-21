#!/usr/bin/env node
/**
 * Wiplay auto-commit hook — runs after agent/subagent stops.
 * Stages tracked changes and creates a conventional commit when there are modifications.
 */

import { spawnSync } from 'node:child_process';

const BLOCKED_PATTERNS = [
  /^\.env/i,
  /credentials/i,
  /secret/i,
  /^dist\//,
  /^node_modules\//,
  /\.pem$/,
  /\.key$/,
];

function git(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const error = new Error(result.stderr || result.stdout || 'git command failed');
    error.stderr = result.stderr;
    throw error;
  }

  return (result.stdout ?? '').replace(/\s+$/, '');
}

function parseStatusPath(line) {
  const match = line.match(/^..\s+(.*)$/);
  return match ? match[1].trim() : '';
}

function getChangedFiles() {
  const output = git(['status', '--porcelain']);
  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => parseStatusPath(line).replace(/^"(.+)"$/, '$1'))
    .filter(Boolean);
}

function isBlocked(file) {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(file));
}

function inferScope(files) {
  const scopes = new Set();

  for (const file of files) {
    if (file.startsWith('src/app/features/games/')) {
      const match = file.match(/^src\/app\/features\/games\/([^/]+)/);
      if (match) {
        scopes.add(`games/${match[1]}`);
      }
    } else if (file.startsWith('src/app/features/game-shell')) {
      scopes.add('game-shell');
    } else if (file.startsWith('src/app/features/home')) {
      scopes.add('home');
    } else if (file.startsWith('src/app/core/')) {
      scopes.add('core');
    } else if (file.startsWith('src/app/layout/')) {
      scopes.add('layout');
    } else if (file.startsWith('src/app/shared/')) {
      scopes.add('shared');
    } else if (file.startsWith('.cursor/')) {
      scopes.add('cursor');
    } else if (file === 'PLAN.md') {
      scopes.add('docs');
    }
  }

  if (scopes.size === 1) {
    return [...scopes][0];
  }

  if (scopes.size > 1) {
    return 'wiplay';
  }

  return 'wiplay';
}

function inferType(files) {
  const onlyDocs = files.every(
    (file) => file.endsWith('.md') || file.startsWith('.cursor/hooks/README'),
  );
  if (onlyDocs) {
    return 'docs';
  }

  const onlyHooks = files.every((file) => file.startsWith('.cursor/'));
  if (onlyHooks) {
    return 'chore';
  }

  const onlyTests = files.every((file) => file.includes('.spec.'));
  if (onlyTests) {
    return 'test';
  }

  const fixHints = ['fix', 'bug', 'error', 'load', 'keyboard'];
  const joined = files.join(' ').toLowerCase();
  if (fixHints.some((hint) => joined.includes(hint))) {
    return 'fix';
  }

  return 'feat';
}

function buildSummary(files) {
  if (files.length === 1) {
    return `update ${files[0]}`;
  }

  if (files.length <= 3) {
    return `update ${files.join(', ')}`;
  }

  const groups = new Map();
  for (const file of files) {
    const top = file.split('/')[0] ?? file;
    groups.set(top, (groups.get(top) ?? 0) + 1);
  }

  const parts = [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name} (${count})`);

  return `update ${parts.join(', ')}`;
}

function buildCommitMessage(files) {
  const type = inferType(files);
  const scope = inferScope(files);
  const summary = buildSummary(files);

  return `${type}(${scope}): ${summary}`;
}

function main() {
  let files;
  try {
    files = getChangedFiles();
  } catch (error) {
    console.error('[auto-commit] Not a git repository or git unavailable.', error.message);
    process.exit(0);
  }

  if (files.length === 0) {
    process.exit(0);
  }

  const allowed = files.filter((file) => !isBlocked(file));
  const blocked = files.filter((file) => isBlocked(file));

  if (allowed.length === 0) {
    console.error('[auto-commit] Skipped — only blocked files changed:', blocked.join(', '));
    process.exit(0);
  }

  if (blocked.length > 0) {
    console.error('[auto-commit] Skipped blocked files:', blocked.join(', '));
  }

  try {
    for (const file of allowed) {
      git(['add', '--', file]);
    }

    const message = buildCommitMessage(allowed);
    git(['commit', '-m', message]);
    console.error(`[auto-commit] Created commit: ${message}`);
  } catch (error) {
    console.error('[auto-commit] Commit failed:', error.stderr?.toString() ?? error.message);
    process.exit(0);
  }
}

main();
