#!/usr/bin/env node
/**
 * First-run installer for the video editor. Re-running it is harmless.
 *
 * What it does, in order:
 *   1. Confirms Node 22+, Git, FFmpeg and FFprobe are on PATH.
 *   2. Fetches the editing engine (Herk Edit Kit) into engine/ at a fixed commit.
 *   3. Installs the engine's npm packages.
 *   4. Renders the engine's demo project and copies it to output/setup-test.mp4.
 *   5. Reports which transcription route (Groq or local Whisper) is ready.
 *
 * Usage: node setup.mjs
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(ROOT, 'engine');
const OUTPUT = join(ROOT, 'output');

// Engine source. To upgrade: pick a newer commit on herk-edit-kit `main`,
// paste its full hash here, delete engine/, and run setup again.
const ENGINE_REPO = 'https://github.com/nateherkai/herk-edit-kit.git';
const ENGINE_COMMIT = '10511e5af86fc47756ea89803b397422e2d89284';

// The engine ships ~380 MB of showcase and sample media that editing never needs.
const ENGINE_SKIP = [
  '/*',
  '!/examples/showcase/',
  ...['mp4', 'mov', 'webm', 'mp3', 'wav'].map((ext) => `!/video-projects/**/*.${ext}`),
];

const isWindows = process.platform === 'win32';

/** Run a command; returns true on exit code 0. `quiet` hides its output. */
function exec(cmd, args, { cwd = ROOT, quiet = false } = {}) {
  const options = { cwd, encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' };
  // On Windows npm/npx are .cmd shims that only start through a shell.
  // Every argument passed here is a constant from this file, never user input.
  const needsShell = isWindows && ['npm', 'npx'].includes(cmd);
  const result = needsShell
    ? spawnSync([cmd, ...args].join(' '), { ...options, shell: true })
    : spawnSync(cmd, args, options);
  return !result.error && result.status === 0;
}

function heading(text) {
  console.log(`\n--- ${text}`);
}

function stop(reason) {
  console.error(`\nSetup could not finish: ${reason}`);
  process.exit(1);
}

function installHint() {
  if (isWindows) return 'winget install OpenJS.NodeJS.LTS Git.Git Gyan.FFmpeg  (open a new terminal afterwards)';
  if (process.platform === 'darwin') return 'brew install node git ffmpeg';
  return 'install node (22+), git and ffmpeg with your package manager';
}

// 1. Tools -----------------------------------------------------------------
heading('Checking required tools');
const missing = new Set();
if (Number(process.versions.node.split('.')[0]) < 22) missing.add('Node.js 22+');
if (!exec('git', ['--version'], { quiet: true })) missing.add('Git');
if (!exec('ffmpeg', ['-version'], { quiet: true })) missing.add('FFmpeg');
if (!exec('ffprobe', ['-version'], { quiet: true })) missing.add('FFmpeg');
if (missing.size) stop(`missing ${[...missing].join(', ')}.\nTry: ${installHint()}`);
console.log(`OK  Node ${process.versions.node}, Git, FFmpeg`);

// 2. Engine ----------------------------------------------------------------
heading('Editing engine (Herk Edit Kit) -> engine/');
if (existsSync(join(ENGINE, '.git'))) {
  console.log('Already present, leaving it as is.');
} else {
  const shallow = ['--depth', '1', '--filter=blob:limit=1m'];
  if (!exec('git', ['clone', '--quiet', '--no-checkout', ...shallow, ENGINE_REPO, ENGINE])) {
    stop('downloading the engine failed. Check the internet connection and try again.');
  }
  exec('git', ['-C', ENGINE, 'fetch', '--quiet', ...shallow, 'origin', ENGINE_COMMIT]);
  exec('git', ['-C', ENGINE, 'sparse-checkout', 'set', '--no-cone', ...ENGINE_SKIP]);
  if (!exec('git', ['-C', ENGINE, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', ENGINE_COMMIT])) {
    stop(`checking out engine commit ${ENGINE_COMMIT} failed.`);
  }
}

// 3. Engine packages -------------------------------------------------------
heading('Engine packages');
if (existsSync(join(ENGINE, 'node_modules', 'hyperframes'))) {
  console.log('Already installed.');
} else if (!exec('npm', ['ci', '--no-audit', '--no-fund'], { cwd: ENGINE })) {
  stop('npm ci failed inside engine/. See the error above.');
}
exec('npm', ['run', 'setup', '--silent'], { cwd: ENGINE });

// 4. Test render -----------------------------------------------------------
heading('Test render');
for (const dir of ['input/b-roll', 'input/images', 'input/audio', 'output', 'profile']) {
  mkdirSync(join(ROOT, dir), { recursive: true });
}
const demoDir = join(ENGINE, 'video-projects', 'demo');
const demoVideo = join(demoDir, 'renders', 'demo.mp4');
if (!existsSync(demoDir)) exec('npm', ['run', 'demo', '--silent'], { cwd: ENGINE });
if (!existsSync(demoVideo)) {
  const rendered = exec('npx', ['hyperframes', 'render', '--quality', 'draft', '--output', 'renders/demo.mp4'], { cwd: demoDir });
  if (!rendered) stop('the test render failed. Run `npx hyperframes doctor` in engine/video-projects/demo (usually a Chrome issue).');
}
const testVideo = join(OUTPUT, 'setup-test.mp4');
copyFileSync(demoVideo, testVideo);
console.log(`OK  ${testVideo}`);

// 5. Transcription ---------------------------------------------------------
heading('Transcription');
const envFile = join(ROOT, '.env');
if (!existsSync(envFile)) copyFileSync(join(ROOT, '.env.example'), envFile);
try {
  process.loadEnvFile(envFile);
} catch {
  // An unreadable .env just means no Groq key.
}
const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());
const python = ['python3', 'python'].find((bin) => exec(bin, ['--version'], { quiet: true }));
const hasLocal = Boolean(python) && exec(python, ['-c', 'import faster_whisper'], { quiet: true });
console.log(`Groq key in .env:      ${hasGroq ? 'yes' : 'no'}`);
console.log(`Local faster-whisper:  ${hasLocal ? `yes (${python})` : 'no'}`);

const ready = hasGroq || hasLocal;
console.log(`\nSETUP DONE${ready ? '' : ' - transcription still needs a Groq key or faster-whisper'}`);
console.log(`Put a video in ${join(ROOT, 'input')} and tell your agent: edit this.`);
