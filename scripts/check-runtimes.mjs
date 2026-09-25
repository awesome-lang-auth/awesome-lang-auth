#!/usr/bin/env node
/**
 * Checks that every install command on the home page still works.
 *
 * Reads src/data/runtimes.ts (the single source of truth) and, for each
 * runtime marked `available`, asks its registry whether the package and the
 * version the page shows still resolve: npm, PyPI, pub.dev, crates.io, the Go
 * module proxy, or the GitHub repository for git installs. Exits 1 when one
 * does not. Runtimes marked `available: false` are queried too, but only
 * reported, so the day they start resolving is visible in the log.
 *
 * Runs weekly from .github/workflows/check-runtimes.yml, never on a build:
 * a registry outage must not break a deploy.
 *
 * Needs a Node.js that strips TypeScript types (22.18+, 23.6+, 24):
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-runtimes.mjs
 */

const TIMEOUT_MS = 20_000;
const ATTEMPTS = 3;
const USER_AGENT = 'awesome-lang-auth-check-runtimes (+https://github.com/awesome-lang-auth/awesome-lang-auth)';

let RUNTIMES;
try {
  ({ RUNTIMES } = await import(new URL('../src/data/runtimes.ts', import.meta.url)));
} catch (err) {
  console.error(`check-runtimes: cannot load src/data/runtimes.ts with Node ${process.version}.`);
  console.error('It needs TypeScript type stripping (Node 22.18+, 23.6+ or 24).');
  console.error(String(err?.message ?? err));
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET with a timeout; retries network errors, 429 and 5xx. Other statuses are answers. */
async function get(url, accept = 'application/json') {
  let last;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept, 'user-agent': USER_AGENT },
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status !== 429 && res.status < 500) return res;
      last = `HTTP ${res.status}`;
    } catch (err) {
      last = err?.cause?.code ?? err?.message ?? String(err);
    }
    if (attempt < ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
  }
  throw new Error(`unreachable after ${ATTEMPTS} attempts (${last}): ${url}`);
}

async function json(res, what) {
  try {
    return await res.json();
  } catch {
    throw new Error(`${what}: the registry did not answer with JSON (HTTP ${res.status})`);
  }
}

const pass = (detail, warnings = []) => ({ ok: true, detail, warnings });
const fail = (detail, warnings = []) => ({ ok: false, detail, warnings });

// ── Registries ───────────────────────────────────────────────────────────────

async function checkNpm({ name, version }) {
  const res = await get(`https://registry.npmjs.org/${name.replace('/', '%2F')}`);
  if (res.status === 404) return fail(`npm: ${name} is not published`);
  if (!res.ok) return fail(`npm: HTTP ${res.status} for ${name}`);
  const doc = await json(res, 'npm');
  const latest = doc['dist-tags']?.latest;
  const shown = doc.versions?.[version];
  if (!shown) return fail(`npm: ${name}@${version} does not exist (latest ${latest ?? 'none'})`);
  if (shown.deprecated) return fail(`npm: ${name}@${version} is deprecated: ${shown.deprecated}`);
  // The command has no version, so it installs `latest`.
  const installed = doc.versions?.[latest];
  if (installed?.deprecated) return fail(`npm: ${name}@${latest} (latest) is deprecated: ${installed.deprecated}`);
  const warnings = latest !== version ? [`npm latest is ${latest}, the page shows ${version}`] : [];
  return pass(`npm: ${name}@${version}`, warnings);
}

async function checkPypi({ name, version }) {
  const res = await get(`https://pypi.org/pypi/${encodeURIComponent(name)}/${encodeURIComponent(version)}/json`);
  if (res.status === 404) return fail(`PyPI: ${name} ${version} does not exist`);
  if (!res.ok) return fail(`PyPI: HTTP ${res.status} for ${name} ${version}`);
  const doc = await json(res, 'PyPI');
  const files = doc.urls ?? [];
  if (files.length === 0) return fail(`PyPI: ${name} ${version} has no files`);
  if (files.every((f) => f.yanked)) return fail(`PyPI: ${name} ${version} is yanked`);
  const latestRes = await get(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
  const latest = latestRes.ok ? (await json(latestRes, 'PyPI')).info?.version : undefined;
  const warnings = latest && latest !== version ? [`PyPI latest is ${latest}, the page shows ${version}`] : [];
  return pass(`PyPI: ${name} ${version}`, warnings);
}

async function checkPub({ name, version }) {
  const res = await get(`https://pub.dev/api/packages/${encodeURIComponent(name)}`, 'application/vnd.pub.v2+json');
  if (res.status === 404) return fail(`pub.dev: ${name} is not published`);
  if (!res.ok) return fail(`pub.dev: HTTP ${res.status} for ${name}`);
  const doc = await json(res, 'pub.dev');
  if (doc.isDiscontinued) {
    return fail(`pub.dev: ${name} is discontinued${doc.replacedBy ? `, replaced by ${doc.replacedBy}` : ''}`);
  }
  const shown = (doc.versions ?? []).find((v) => v.version === version);
  if (!shown) return fail(`pub.dev: ${name} ${version} does not exist (latest ${doc.latest?.version ?? 'none'})`);
  if (shown.retracted) return fail(`pub.dev: ${name} ${version} is retracted`);
  const latest = doc.latest?.version;
  const warnings = latest && latest !== version ? [`pub.dev latest is ${latest}, the page shows ${version}`] : [];
  return pass(`pub.dev: ${name} ${version}`, warnings);
}

// Module paths are case-encoded on the proxy: every capital becomes "!" + lowercase.
const goEscape = (s) => s.replace(/[A-Z]/g, (c) => `!${c.toLowerCase()}`);

async function checkGo({ module, version }) {
  const base = `https://proxy.golang.org/${goEscape(module)}/@v/${goEscape(version)}`;
  const info = await get(`${base}.info`);
  if (info.status === 404 || info.status === 410) return fail(`Go proxy: ${module}@${version} does not exist`);
  if (!info.ok) return fail(`Go proxy: HTTP ${info.status} for ${module}@${version}`);
  // `go get <path>@<version>` also fails when go.mod declares a different path.
  const mod = await get(`${base}.mod`, 'text/plain');
  const declared = mod.ok ? /^module\s+(\S+)/m.exec(await mod.text())?.[1] : undefined;
  if (declared !== module) return fail(`Go proxy: ${module}@${version} declares module ${declared ?? '(unreadable)'}`);
  const latestRes = await get(`https://proxy.golang.org/${goEscape(module)}/@latest`);
  const latest = latestRes.ok ? (await json(latestRes, 'Go proxy')).Version : undefined;
  const warnings = latest && latest !== version ? [`Go proxy latest is ${latest}, the page shows ${version}`] : [];
  return pass(`Go proxy: ${module}@${version}`, warnings);
}

async function checkCrates({ name, version }) {
  const res = await get(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}/${encodeURIComponent(version)}`);
  if (res.status === 404) return fail(`crates.io: ${name} ${version} does not exist`);
  if (!res.ok) return fail(`crates.io: HTTP ${res.status} for ${name} ${version}`);
  const doc = await json(res, 'crates.io');
  if (doc.version?.yanked) return fail(`crates.io: ${name} ${version} is yanked`);
  return pass(`crates.io: ${name} ${version}`);
}

function githubRepo(url) {
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(url);
  if (!m) throw new Error(`not a GitHub repository URL: ${url}`);
  return { owner: m[1], repo: m[2] };
}

/** What `git clone` asks first; GitHub answers 401 for a missing or private repo. */
async function gitReachable(url) {
  const { owner, repo } = githubRepo(url);
  const res = await get(`https://github.com/${owner}/${repo}.git/info/refs?service=git-upload-pack`, '*/*');
  return res.status === 200;
}

function declaredName(path, text) {
  if (path.endsWith('Cargo.toml')) {
    const pkg = /^\[package\]([\s\S]*?)(?=^\[|$(?![\s\S]))/m.exec(text)?.[1] ?? '';
    return /^\s*name\s*=\s*"([^"]+)"/m.exec(pkg)?.[1];
  }
  if (path.endsWith('pubspec.yaml')) return /^name:\s*['"]?([\w-]+)/m.exec(text)?.[1];
  if (path.endsWith('package.json')) return JSON.parse(text).name;
  throw new Error(`no name parser for ${path}`);
}

async function checkGit({ url, manifest }) {
  if (!(await gitReachable(url))) return fail(`git: ${url} is not a public repository`);
  if (!manifest) return pass(`git: ${url}`);
  const { owner, repo } = githubRepo(url);
  const res = await get(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${manifest.path}`, 'text/plain');
  if (!res.ok) return fail(`git: ${manifest.path} is missing on the default branch of ${owner}/${repo}`);
  const name = declaredName(manifest.path, await res.text());
  if (name !== manifest.name) {
    return fail(`git: ${owner}/${repo}/${manifest.path} declares ${name ?? '(no name)'}, the command adds ${manifest.name}`);
  }
  return pass(`git: ${owner}/${repo}, ${manifest.path} declares ${name}`);
}

const CHECKERS = { npm: checkNpm, pypi: checkPypi, pub: checkPub, go: checkGo, crates: checkCrates, git: checkGit };

/**
 * The command shown must install what the check queries, or the check proves
 * nothing. Each expected part must be a whole word of the command: a substring
 * match would let `pip install awesome-python-authx` pass for awesome-python-auth.
 * A command that pins a version (`npm i name@1.2.3`) must be expected in that
 * pinned form, as Go already is.
 */
function commandDrift({ command, registry }) {
  let expected;
  if (registry.kind === 'go') {
    expected = [`${registry.module}@${registry.version}`];
  } else if (registry.kind === 'git') {
    expected = [registry.url];
    if (registry.manifest) {
      expected.push(registry.manifest.name);
      // A manifest in a subdirectory is reached through that directory
      // (`--git-path packages/awesome_dart_auth`), so the command must name it.
      const dir = registry.manifest.path.split('/').slice(0, -1).join('/');
      if (dir) expected.push(dir);
    }
  } else {
    expected = [registry.name];
  }
  const words = command.trim().split(/\s+/);
  const missing = expected.filter((part) => !words.includes(part));
  return missing.length ? `the command does not mention ${missing.join(', ')}` : null;
}

async function checkRuntime(runtime) {
  const checker = CHECKERS[runtime.registry.kind];
  if (!checker) return fail(`unknown registry kind "${runtime.registry.kind}"`);
  const drift = commandDrift(runtime);
  if (drift) return fail(`src/data/runtimes.ts: ${drift}`);
  let result;
  try {
    result = await checker(runtime.registry);
  } catch (err) {
    result = fail(String(err?.message ?? err));
  }
  // The page links the repository too; a git install already checked it.
  if (runtime.registry.kind !== 'git' || runtime.registry.url !== runtime.repo) {
    try {
      if (!(await gitReachable(runtime.repo))) result = fail(`${result.detail}; repository ${runtime.repo} is not public`, result.warnings);
    } catch (err) {
      result = fail(`${result.detail}; repository ${runtime.repo}: ${err?.message ?? err}`, result.warnings);
    }
  }
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const results = await Promise.all(RUNTIMES.map(async (runtime) => ({ runtime, ...(await checkRuntime(runtime)) })));

let failures = 0;
const summary = ['| runtime | status | detail |', '|---|---|---|'];
console.log(`check-runtimes: ${RUNTIMES.length} runtimes, ${RUNTIMES.filter((r) => r.available).length} marked available`);
for (const { runtime, ok, detail, warnings } of results) {
  let status;
  if (runtime.available) {
    status = ok ? 'ok' : 'FAIL';
    if (!ok) failures++;
  } else {
    status = ok ? 'skip (resolves now: mark it available)' : 'skip (not available yet)';
  }
  console.log(`${status.padEnd(6)} ${runtime.id.padEnd(8)} ${runtime.command}`);
  console.log(`       ${' '.repeat(8)} ${detail}`);
  for (const w of warnings) console.log(`       ${' '.repeat(8)} warning: ${w}`);
  summary.push(`| ${runtime.id} | ${status} | ${[detail, ...warnings.map((w) => `warning: ${w}`)].join('<br>').replaceAll('|', '\\|')} |`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Home page install commands\n\n${summary.join('\n')}\n`);
}

if (failures > 0) {
  console.error(`check-runtimes: ${failures} command(s) marked available no longer resolve. Update src/data/runtimes.ts.`);
  process.exit(1);
}
console.log('check-runtimes: every command marked available resolves.');
