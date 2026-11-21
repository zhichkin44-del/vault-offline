#!/usr/bin/env node
// Runs the tests through tsx. The file list is collected here, because a `test/*.test.ts` glob is not expanded
// by the Windows shell or by node --test on Node 20.
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = readdirSync(join(root, 'test')).filter((f) => f.endsWith('.test.ts')).sort().map((f) => join('test', f));
const r = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { cwd: root, stdio: 'inherit' });
process.exit(r.status ?? 1);
