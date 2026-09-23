#!/usr/bin/env node
// Publishes only explicitly approved, judge-passing sites to GitHub Pages.
//
// The contradiction this resolves: docs/<slug>/ is gitignored on the working
// branch on purpose (build output must never leak private briefing data,
// draft content or secrets into the repo history people actually browse),
// yet GitHub Pages needs *some* branch to serve static files from. The fix
// is a dedicated, orphan-style `gh-pages` branch that contains nothing but
// already-rendered, already-judged HTML for briefings that have been
// explicitly marked `freigabe: { status: 'confirmed', value: true }` by the
// agency (see Section A schema addition, DECISIONS.md). No briefing JSON,
// no draft/unconfirmed content, and no dashboard/wirt-portal secrets are
// ever copied onto that branch — only the same static HTML npm run build
// already produces for approved slugs.
//
// This script defaults to a dry run: it builds the approved sites and
// reports exactly what would be published. Pass --push (or set
// PUBLISH_PUSH=1) to actually commit and push the gh-pages branch, since
// that is a public, shared-state action this script does not take silently.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll } from './build.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function approvedFilter(briefing) {
  return briefing.freigabe?.status === 'confirmed' && briefing.freigabe.value === true;
}

async function git(args, cwd = root) {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
}

async function branchExists(branch) {
  try {
    await git(['show-ref', '--verify', `refs/heads/${branch}`]);
    return true;
  } catch {
    try {
      await git(['ls-remote', '--exit-code', '--heads', 'origin', branch]);
      return true;
    } catch {
      return false;
    }
  }
}

async function main() {
  const push = process.argv.includes('--push') || process.env.PUBLISH_PUSH === '1';

  const results = await buildAll({ publicBaseUrl: process.env.PUBLIC_BASE_URL, apiBase: process.env.WIRT_API_BASE_URL, filter: approvedFilter });
  const approved = results.filter((r) => r.ok);
  const notApproved = results.filter((r) => !r.ok && r.stage === 'filtered');
  const failed = results.filter((r) => !r.ok && r.stage !== 'filtered');

  console.log(`${approved.length} freigegebene Site(s) gebaut und judge-geprüft.`);
  for (const r of approved) console.log(`  ✔ ${r.slug}`);
  if (notApproved.length) console.log(`${notApproved.length} Briefing(s) ohne Freigabe übersprungen.`);
  if (failed.length) {
    console.error(`${failed.length} freigegebene(s) Briefing(s) fehlgeschlagen (Validierung/Judge) und werden NICHT veröffentlicht:`);
    for (const r of failed) console.error(`  ✘ ${r.file} [${r.stage}]`);
  }

  if (approved.length === 0) {
    console.log('Keine freigegebenen, judge-geprüften Sites zum Veröffentlichen.');
    process.exitCode = failed.length ? 1 : 0;
    return;
  }

  if (!push) {
    console.log('\nTrockenlauf (keine Änderungen). Mit --push (oder PUBLISH_PUSH=1) auf den gh-pages-Branch veröffentlichen.');
    return;
  }

  const branch = 'gh-pages';
  const exists = await branchExists(branch);
  const worktreeDir = await mkdtemp(path.join(tmpdir(), 'gastro-v3-publish-'));
  try {
    if (exists) {
      await git(['fetch', 'origin', branch]).catch(() => {});
      await git(['worktree', 'add', worktreeDir, branch]).catch(async () => {
        await git(['worktree', 'add', '--track', '-B', branch, worktreeDir, `origin/${branch}`]);
      });
    } else {
      await git(['worktree', 'add', '--detach', worktreeDir]);
      await git(['checkout', '--orphan', branch], worktreeDir);
      await git(['rm', '-rf', '--ignore-unmatch', '.'], worktreeDir);
    }

    for (const r of approved) {
      const src = path.join(root, 'docs', r.slug);
      const dest = path.join(worktreeDir, r.slug);
      await cp(src, dest, { recursive: true });
    }

    await git(['add', '-A'], worktreeDir);
    const status = await git(['status', '--porcelain'], worktreeDir);
    if (!status) {
      console.log('Keine Änderungen gegenüber dem veröffentlichten Stand.');
      return;
    }
    await git(['commit', '-m', `publish: ${approved.map((r) => r.slug).join(', ')}`], worktreeDir);
    await git(['push', 'origin', `HEAD:${branch}`], worktreeDir);
    console.log(`\nVeröffentlicht auf ${branch}: ${approved.map((r) => r.slug).join(', ')}`);
  } finally {
    await git(['worktree', 'remove', '--force', worktreeDir]).catch(() => {});
    await rm(worktreeDir, { recursive: true, force: true }).catch(() => {});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
