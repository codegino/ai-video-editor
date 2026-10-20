#!/usr/bin/env node
/**
 * Finds spoken "Direk AI" commands in a word-timed transcript.
 *
 * The user can talk to the editor while recording, in any language, e.g.
 *   "Direk AI, cut that, I'll say it again"
 *   "Direk AI, put a title card at the bottom"
 * This script only finds them. Interpreting each command is the editor's job
 * (see the "Direk AI commands" section of the video-editor skill).
 *
 * For each cue it reports:
 *   heard     the wake phrase as transcribed ("Direk AI", "direct AI", ...)
 *   exact     true when it was transcribed as "Direk AI"; mis-hearings are false
 *             and may be ordinary speech, so judge them from context
 *   command   the words after the wake phrase, up to the next clear pause
 *   before / after   about 10 s of transcript on each side, for context
 *   cut       the time range to remove from the video (wake phrase + command,
 *             plus the pauses around it), with the word indices it covers
 *
 * Usage: node tools/cues.mjs <raw.json> [--json] [--context 10] [--pause 0.7]
 */
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: 'boolean', default: false },
    context: { type: 'string', default: '10' }, // seconds of transcript shown on each side
    pause: { type: 'string', default: '0.7' }, // a gap this long ends a command
  },
});
const file = positionals[0];
if (!file || !existsSync(file)) {
  console.error('Usage: node tools/cues.mjs <raw.json> [--json] [--context 10] [--pause 0.7]');
  process.exit(1);
}

const CONTEXT = Number(flags.context);
const PAUSE = Number(flags.pause);
const MAX_COMMAND_SECS = 25; // a dictated card can run long; never swallow more than this

// How Whisper tends to hear "Direk" and "AI". Matched after lowercasing and
// stripping punctuation, so "Direk, A.I." becomes ["direk", "ai"].
const DIREK = new Set(['direk', 'direct', 'derek', 'direck', 'dirk', 'direc', 'dire', 'derrick', 'deric', 'derik', 'directo', 'director']);
const AI = new Set(['ai', 'ay', 'ei', 'eye', 'aye']);
// Sometimes both words come back joined: "DirekAI", "Direk-AI".
const JOINED = /^(direk|direct|derek|direck|dirk|direc|derik)(ai|ay)$/;

const norm = (text) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

const { words } = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(words)) {
  console.error(`${file} has no "words" list. Pass the raw.json from tools/transcribe.mjs.`);
  process.exit(1);
}
const keys = words.map((w) => norm(w.text));

/** Length of the wake phrase starting at word i (1 or 2 words), or 0. */
function wakeAt(i) {
  if (JOINED.test(keys[i])) return 1;
  if (DIREK.has(keys[i]) && AI.has(keys[i + 1] ?? '')) return 2;
  return 0;
}

const span = (from, to) => words.slice(from, to).map((w) => w.text).join(' ');
const clock = (secs) => {
  const m = Math.floor(secs / 60);
  const s = (secs - m * 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
};

const cues = [];
for (let i = 0; i < words.length; i++) {
  const wake = wakeAt(i);
  if (!wake) continue;

  // The command runs from after the wake phrase to the first clear pause,
  // the next wake phrase, or the length cap.
  const first = i + wake;
  let last = first - 1; // index of the last command word; first - 1 means no words
  for (let j = first; j < words.length; j++) {
    if (j > first && words[j].start - words[j - 1].end >= PAUSE) break;
    if (wakeAt(j)) break;
    if (words[j].end - words[i].start > MAX_COMMAND_SECS) break;
    last = j;
  }
  if (last < first) continue; // "Direk AI" with nothing after it is not a command

  // Cut from the end of the previous word to the start of the next one, so the
  // pauses around the command go too.
  const cutStart = i > 0 ? words[i - 1].end : 0;
  const cutEnd = last + 1 < words.length ? words[last + 1].start : words[last].end;

  const ctxFrom = words.findIndex((w) => w.end >= words[i].start - CONTEXT);
  let ctxTo = last + 1;
  while (ctxTo < words.length && words[ctxTo].start <= words[last].end + CONTEXT) ctxTo++;

  cues.push({
    at: words[i].start,
    heard: span(i, first),
    exact: wake === 2 ? keys[i] === 'direk' && keys[i + 1] === 'ai' : /^direkai$/.test(keys[i]),
    command: span(first, last + 1),
    before: span(ctxFrom, i),
    after: span(last + 1, ctxTo),
    cut: { start: cutStart, end: cutEnd, words: [i, last] },
  });
  i = last;
}

if (flags.json) {
  console.log(JSON.stringify(cues, null, 2));
} else if (cues.length === 0) {
  console.log('No "Direk AI" commands found.');
} else {
  console.log(`${cues.length} "Direk AI" command${cues.length === 1 ? '' : 's'} found:\n`);
  cues.forEach((c, n) => {
    const flag = c.exact ? '' : '  (heard differently; may be normal speech)';
    console.log(`#${n + 1} at ${clock(c.at)}  heard "${c.heard}"${flag}`);
    console.log(`   command: ${c.command}`);
    console.log(`   before:  …${c.before}`);
    console.log(`   after:   ${c.after}…`);
    console.log(`   cut:     ${c.cut.start.toFixed(2)}s – ${c.cut.end.toFixed(2)}s (words ${c.cut.words[0]}–${c.cut.words[1]})\n`);
  });
}
