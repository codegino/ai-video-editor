#!/usr/bin/env node
/**
 * Inventory of everything in input/, so the editor can decide roles and order from facts.
 *
 * input/ is one flat folder. Subfolders are allowed and scanned, but only as hints
 * (their names are reported in `folder`). For each file it reports:
 *   kind        video | image | audio | other (by extension)
 *   duration, width, height, rotation, hasAudio, recordedAt (from ffprobe metadata)
 *   audioGuess  music | effect | sting (audio only, by length)
 *   usedBy      projects whose sources.json lists this file, with the role it had there
 *   status      new | used  (main clips are "used" once any project lists them as main,
 *               or a legacy project/render was made from them; assets stay shared)
 *
 * A project records what it was built from in engine/video-projects/<slug>/sources.json:
 *   { "created": "2026-10-19", "sources": [
 *       { "file": "IMG_0616.mov", "role": "main",   "order": 1 },
 *       { "file": "IMG_0615.mov", "role": "retake" },
 *       { "file": "beach.mp4",    "role": "b-roll" },
 *       { "file": "song.mp3",     "role": "music" } ] }
 * `file` is relative to input/.
 *
 * Usage: node tools/inputs.mjs [--json] [--all]
 *   default  table of new main-clip candidates plus all shared assets
 *   --all    include used main clips too
 *   --json   machine-readable output
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = join(ROOT, 'input');
const OUTPUT = join(ROOT, 'output');
const PROJECTS = join(ROOT, 'engine', 'video-projects');

const KINDS = {
  video: ['.mp4', '.mov', '.m4v', '.mkv', '.webm', '.avi', '.mts', '.m2ts', '.3gp'],
  image: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic', '.heif', '.svg', '.bmp', '.tif', '.tiff'],
  audio: ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.aif', '.aiff'],
};
const ASSET_ROLES = new Set(['b-roll', 'image', 'music', 'effect', 'sting', 'audio']);

const { values: flags } = parseArgs({
  options: { json: { type: 'boolean', default: false }, all: { type: 'boolean', default: false } },
});

const kindOf = (file) => {
  const ext = extname(file).toLowerCase();
  return Object.keys(KINDS).find((k) => KINDS[k].includes(ext)) ?? 'other';
};
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.')) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function probe(path) {
  const r = spawnSync('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', path], {
    encoding: 'utf8',
  });
  if (r.status !== 0) return {};
  const info = JSON.parse(r.stdout || '{}');
  const streams = info.streams ?? [];
  const v = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const tags = { ...(info.format?.tags ?? {}), ...(v?.tags ?? {}) };
  const rotation =
    Number(v?.tags?.rotate ?? v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0) || 0;
  const recordedAt =
    tags['com.apple.quicktime.creationdate'] ?? tags.creation_time ?? tags.date ?? null;
  const duration = Number(info.format?.duration);
  return {
    duration: Number.isFinite(duration) ? Math.round(duration * 10) / 10 : null,
    width: v?.width ?? null,
    height: v?.height ?? null,
    rotation,
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
    recordedAt,
  };
}

function orientation({ width, height, rotation }) {
  if (!width || !height) return null;
  const [w, h] = Math.abs(rotation) % 180 === 90 ? [height, width] : [width, height];
  return w > h ? 'horizontal' : w < h ? 'vertical' : 'square';
}

function audioGuess(duration) {
  if (duration == null) return null;
  if (duration <= 3) return 'effect';
  if (duration < 30) return 'sting';
  return 'music';
}

// Which projects used which input files, and in what role.
function loadUsage() {
  const usage = new Map(); // file (relative to input/) -> [{ project, role }]
  const legacy = []; // text from older projects that predate sources.json
  if (!existsSync(PROJECTS)) return { usage, legacy };
  for (const project of readdirSync(PROJECTS)) {
    const dir = join(PROJECTS, project);
    const manifest = join(dir, 'sources.json');
    if (existsSync(manifest)) {
      try {
        for (const s of JSON.parse(readFileSync(manifest, 'utf8')).sources ?? []) {
          if (!s.file) continue;
          const list = usage.get(s.file) ?? [];
          list.push({ project, role: s.role ?? 'main' });
          usage.set(s.file, list);
        }
      } catch {
        console.error(`Warning: could not read ${relative(ROOT, manifest)}`);
      }
    } else {
      for (const f of ['VERIFY.md', 'NOTES.md']) {
        const p = join(dir, f);
        if (existsSync(p)) legacy.push({ project, text: readFileSync(p, 'utf8') });
      }
    }
  }
  return { usage, legacy };
}

const outputs = existsSync(OUTPUT) ? readdirSync(OUTPUT) : [];
const { usage, legacy } = loadUsage();

const items = walk(INPUT)
  .filter((p) => statSync(p).isFile())
  .map((path) => {
    const file = relative(INPUT, path).split(sep).join('/');
    const name = file.split('/').pop();
    const folder = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : null;
    const kind = kindOf(file);
    const meta = kind === 'other' ? {} : probe(path);
    const usedBy = usage.get(file) ?? [];
    const legacyProject = legacy.find((l) => l.text.includes(`input/${file}`))?.project;
    const legacyRender = outputs.some((o) => o.startsWith(`${kebab(name.replace(/\.[^.]+$/, ''))}-`));
    const usedAsMain = usedBy.some((u) => !ASSET_ROLES.has(u.role)) || Boolean(legacyProject) || legacyRender;
    const priorRole = usedBy.at(-1)?.role ?? null;
    const item = {
      file,
      folder,
      kind,
      ...meta,
      orientation: kind === 'video' || kind === 'image' ? orientation(meta) : undefined,
      audioGuess: kind === 'audio' ? audioGuess(meta.duration) : undefined,
      modified: statSync(path).mtime.toISOString(),
      usedBy: legacyProject ? [...usedBy, { project: legacyProject, role: 'main (legacy)' }] : usedBy,
      priorRole,
    };
    item.status = kind === 'video' && usedAsMain ? 'used' : 'new';
    return item;
  })
  .sort((a, b) => (a.recordedAt ?? a.modified).localeCompare(b.recordedAt ?? b.modified));

const visible = flags.all ? items : items.filter((i) => i.status === 'new');

if (flags.json) {
  console.log(JSON.stringify(visible, null, 2));
} else if (!visible.length) {
  console.log('input/ has nothing new.');
} else {
  for (const i of visible) {
    const bits = [
      i.kind.padEnd(5),
      i.status.padEnd(4),
      i.duration != null ? `${i.duration}s` : '',
      i.orientation ?? '',
      i.kind === 'video' ? (i.hasAudio ? 'audio' : 'no audio') : '',
      i.audioGuess ?? '',
      i.recordedAt ? `rec ${i.recordedAt}` : `mod ${i.modified}`,
      i.priorRole ? `was ${i.priorRole}` : '',
    ].filter(Boolean);
    console.log(`${i.file}\n    ${bits.join(' · ')}`);
  }
}
