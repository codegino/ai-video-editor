#!/usr/bin/env node
/**
 * Word-level transcription for the editing engine, at no cost.
 *
 * Writes <video-name>.json next to the video in the shape the engine's cut tools read:
 *   { text, audio_duration_secs, words: [{ text, start, end }] }
 *
 * Routes:
 *   (default)  Groq's hosted whisper-large-v3. Needs GROQ_API_KEY in .env.
 *              Accurate on mixed-language speech, and fast.
 *   --local    faster-whisper on this machine. Needs Python + `pip install faster-whisper`.
 *
 * Vocabulary hint: if profile/vocabulary.md exists, its terms are sent to Whisper as a
 * prompt so names, brands and jargon come back spelled the way you spell them.
 *
 * Usage: node tools/transcribe.mjs <video> [--local] [--model large-v3]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VOCABULARY_FILE = join(ROOT, 'profile', 'vocabulary.md');
const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
// Whisper only reads the last ~224 tokens of a prompt; ~800 characters stays inside that.
const PROMPT_CHAR_LIMIT = 800;

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    local: { type: 'boolean', default: false },
    model: { type: 'string', default: 'large-v3' },
  },
});
const video = positionals[0];
if (!video || !existsSync(video)) {
  console.error('Usage: node tools/transcribe.mjs <video> [--local] [--model large-v3]');
  process.exit(1);
}

try {
  process.loadEnvFile(join(ROOT, '.env'));
} catch {
  // No .env yet: only --local can work.
}

/** Run a command and return its stdout, or throw with the last stderr line. */
function capture(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, windowsHide: true });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? result.stderr.trim().split('\n').pop();
    throw new Error(`${cmd} failed: ${detail}`);
  }
  return result.stdout;
}

/**
 * Turn profile/vocabulary.md into a short Whisper prompt.
 * Drops the explanatory header (HTML comments), headings and list markers,
 * keeping only the words you listed. Returns '' when there is nothing to send.
 */
function vocabularyPrompt() {
  if (!existsSync(VOCABULARY_FILE)) return '';
  const terms = readFileSync(VOCABULARY_FILE, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('#'))
    .map((line) => line.replace(/^\s*(?:[-*+]|\d+\.)\s*/, '').trim())
    .filter(Boolean);
  return terms.join(', ').slice(0, PROMPT_CHAR_LIMIT);
}

async function viaGroq(prompt) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    console.error('No GROQ_API_KEY in .env. Get a free key at https://console.groq.com/keys, or run with --local.');
    process.exit(2);
  }
  // Mono 16 kHz 64 kbps MP3 keeps uploads small. Groq's free tier accepts up to 25 MB
  // per request (roughly 50 minutes), which covers short-form videos comfortably.
  const { dir, name } = parse(resolve(video));
  const audio = join(dir, `${name}.transcribe.mp3`);
  capture('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k', audio]);

  const form = new FormData();
  form.append('file', new Blob([readFileSync(audio)]), 'audio.mp3');
  form.append('model', 'whisper-large-v3');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  // Language is left to auto-detect on purpose: forcing one language tends to mangle speech that mixes languages.
  if (prompt) form.append('prompt', prompt);

  let response;
  try {
    response = await fetch(GROQ_URL, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  } finally {
    rmSync(audio, { force: true });
  }
  if (!response.ok) {
    console.error(`Groq returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    process.exit(3);
  }
  const body = await response.json();
  return (body.words ?? []).map((w) => ({ text: w.word.trim(), start: w.start, end: w.end }));
}

function viaLocal(prompt) {
  const python = ['python3', 'python'].find((bin) => !spawnSync(bin, ['--version']).error);
  if (!python) {
    console.error('Python was not found. Install Python 3, then: pip install faster-whisper');
    process.exit(2);
  }
  const script = join(ROOT, 'tools', 'transcribe_local.py');
  return JSON.parse(capture(python, [script, resolve(video), flags.model, prompt]));
}

const prompt = vocabularyPrompt();
if (prompt) console.log(`Using vocabulary hint from profile/vocabulary.md (${prompt.length} chars).`);

const duration = Number(capture('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]));
const words = (flags.local ? viaLocal(prompt) : await viaGroq(prompt)).filter((w) => w.text && w.end >= w.start);

if (words.length === 0) {
  console.error('Transcription came back without timed words. Does the video have speech?');
  process.exit(4);
}

const { dir, name } = parse(resolve(video));
const outFile = join(dir, `${name}.json`);
const transcript = { text: words.map((w) => w.text).join(' '), audio_duration_secs: duration, words };
writeFileSync(outFile, `${JSON.stringify(transcript, null, 2)}\n`);
console.log(`${words.length} words, ${duration.toFixed(1)}s -> ${outFile}`);
