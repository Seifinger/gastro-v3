// Regression guard for the Windows file://-URL path bug (see
// DECISIONS.md, "Prospect workflow repair"): `new URL(x).pathname` keeps
// a leading slash before the drive letter on Windows (`/C:/Users/...`),
// which produced a doubled `C:\C:\...` prefix when joined with more
// Windows-style path segments. The correct, platform-safe conversion is
// `fileURLToPath(new URL(...))`. This test scans the source tree so the
// bug class can't quietly reappear in a new file — verified on every OS,
// not only in Windows CI (see .github/workflows/test.yml for that).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const SKIP_DIRS = new Set(['node_modules', '.git', 'docs', 'coverage', 'data']);
const CODE_EXTENSIONS = new Set(['.js', '.mjs']);

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...await collectFiles(path.join(dir, entry.name)));
    } else if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

const SELF = 'windows-path-safety.test.js';
// Matches `.pathname` used on a `new URL(...)` (or `import.meta.url`)
// expression — the pattern that breaks on Windows file:// URLs. Built from
// string pieces so this file's own explanatory comments/strings above
// don't trip the scan on itself.
const UNSAFE_PATTERN = new RegExp('new URL\\([^)]*\\)' + '\\.pathname' + '|import\\.meta\\.url\\)' + '\\.pathname');

test('no source file converts a file:// URL to a filesystem path via .pathname (use fileURLToPath instead)', async () => {
  const files = await collectFiles(rootDir);
  const offenders = [];
  for (const file of files) {
    if (path.basename(file) === SELF) continue;
    const content = await readFile(file, 'utf-8');
    if (UNSAFE_PATTERN.test(content)) offenders.push(path.relative(rootDir, file));
  }
  assert.deepEqual(offenders, [], `Found unsafe file:// URL -> path conversion(s) in: ${offenders.join(', ')}. Use fileURLToPath(new URL(...)) instead of .pathname.`);
});
