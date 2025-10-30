// Auto-commit watcher: stages and commits changes on file updates
// Requires: chokidar (installed as devDependency)

const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

const REPO_ROOT = process.cwd();
const IGNORED = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.vercel/**',
  '**/.DS_Store',
  '**/*.swp',
  '**/*.tmp'
];

let pending = false;
let lastTimer = null;
const DEBOUNCE_MS = 2000;

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: REPO_ROOT, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`[auto-commit] Error running: ${cmd}\n${stderr || err.message}`);
      }
      if (stdout) process.stdout.write(stdout);
      resolve(!err);
    });
  });
}

async function ensureGitIdentity() {
  await run('git config user.email || git config user.email "auto@local"');
  await run('git config user.name || git config user.name "Auto Commit"');
}

async function commitAll() {
  if (pending) return;
  pending = true;
  try {
    await ensureGitIdentity();
    await run('git add -A');
    // skip empty commits
    const hasDiff = await run('git diff --cached --quiet || echo "changes"');
    if (!hasDiff) {
      pending = false;
      return;
    }
    const ts = new Date().toISOString();
    await run(`git commit -m "auto: save changes ${ts}"`);
    console.log(`[auto-commit] committed at ${ts}`);
    // Attempt to push to remote to trigger CI/deploy (non-fatal on failure)
    await run('git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1 && git push || echo "[auto-commit] push skipped (no upstream or push failed)"');
  } finally {
    pending = false;
  }
}

function scheduleCommit() {
  if (lastTimer) clearTimeout(lastTimer);
  lastTimer = setTimeout(commitAll, DEBOUNCE_MS);
}

console.log('[auto-commit] watching for changes...');
const watcher = chokidar.watch('.', {
  cwd: REPO_ROOT,
  ignored: IGNORED,
  ignoreInitial: true,
  persistent: true,
});

watcher
  .on('add', scheduleCommit)
  .on('change', scheduleCommit)
  .on('unlink', scheduleCommit)
  .on('addDir', scheduleCommit)
  .on('unlinkDir', scheduleCommit)
  .on('error', (err) => console.error('[auto-commit] watcher error:', err));

process.on('SIGINT', () => {
  console.log('\n[auto-commit] shutting down');
  process.exit(0);
});


