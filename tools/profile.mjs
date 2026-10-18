#!/usr/bin/env node
/**
 * Profile manager: keep several complete profiles and switch between them.
 *
 *   profile/                 the ACTIVE profile. Everything else reads this path.
 *   profile/.profile-name    marker: which library entry profile/ belongs to.
 *   profiles/<name>/         the library, one folder per profile (about.md = description).
 *   profiles/.trash/         soft-deleted profiles: <name>--<timestamp>/
 *
 * Copy-based (no symlinks) so it works the same on macOS, Linux and Windows.
 * Every command first mirrors profile/ back into profiles/<active>/, so the library
 * is always current. The script only overwrites profile/ when it matches a known
 * library entry; anything else stops with exit code 2 and asks for a decision.
 *
 * Usage: node tools/profile.mjs <command> [args]
 *   list                         all profiles, active marked with *, plus trash
 *   current                      the active profile name (or its state)
 *   save [name]                  sync profile/ to the library; with a name, adopt
 *                                unsaved profile/ content as <name> or "save as" <name>
 *   switch <name> [--discard]    make <name> active (--discard trashes unsaved content)
 *   new <name> [--from <name>] [--discard]
 *                                create a profile (blank, or a copy) and make it active
 *   rename <old> <new>           rename a profile (the active one too)
 *   describe <name> <text...>    set the one-line description in about.md
 *   delete <name> --yes          move a profile to the trash
 *   restore <name> [--as <new>]  bring the newest trashed copy of <name> back
 *   empty-trash --yes            permanently delete everything in the trash
 *
 * Exit codes: 0 ok, 1 error, 2 needs a decision from the user.
 */
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ACTIVE = join(ROOT, 'profile');
const LIBRARY = join(ROOT, 'profiles');
const TRASH = join(LIBRARY, '.trash');
const MARKER = '.profile-name';
const ABOUT = 'about.md';
const JUNK = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class Stop extends Error {
  constructor(message, code = 1) { super(message); this.code = code; }
}

// ---------------------------------------------------------------------------
// Helpers

const slugify = (text) => text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function checkName(name, label = 'name') {
  if (!name) throw new Stop(`Missing profile ${label}.`);
  if (!SLUG.test(name)) {
    const hint = slugify(name);
    throw new Stop(`"${name}" is not a valid profile ${label}. Use lowercase-kebab-case${hint ? `, e.g. "${hint}"` : ''}.`);
  }
  return name;
}

const isDir = (path) => existsSync(path) && statSync(path).isDirectory();
const entries = (dir) => (isDir(dir) ? readdirSync(dir).filter((f) => !JUNK.has(f)) : []);
const libPath = (name) => join(LIBRARY, name);
const libraryNames = () => entries(LIBRARY).filter((f) => !f.startsWith('.') && isDir(libPath(f))).sort();
const hasContent = () => entries(ACTIVE).some((f) => f !== MARKER);

function readMarker() {
  const file = join(ACTIVE, MARKER);
  return existsSync(file) ? readFileSync(file, 'utf8').trim() || null : null;
}
const writeMarker = (name) => writeFileSync(join(ACTIVE, MARKER), `${name}\n`);

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Remove everything inside dir (keeps dir itself; safer on Windows if it is open). */
function clearDir(dir) {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) rmSync(join(dir, f), { recursive: true, force: true });
}

/** Copy the contents of src into dst (dst emptied first), skipping the marker. */
function mirror(src, dst) {
  const staging = join(dirname(dst), `.${basename(dst)}.tmp-${process.pid}`);
  rmSync(staging, { recursive: true, force: true });
  cpSync(src, staging, { recursive: true });
  rmSync(join(staging, MARKER), { force: true });
  clearDir(dst);
  for (const f of readdirSync(staging)) renameSync(join(staging, f), join(dst, f));
  rmSync(staging, { recursive: true, force: true });
}

function readAbout(dir) {
  const file = join(dir, ABOUT);
  if (!existsSync(file)) return '';
  return readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#') && !l.startsWith('<!--')) ?? '';
}

function trashEntries() {
  return entries(TRASH).filter((f) => isDir(join(TRASH, f))).sort();
}

function moveToTrash(src, name) {
  mkdirSync(TRASH, { recursive: true });
  let target = join(TRASH, `${name}--${stamp()}`);
  for (let i = 2; existsSync(target); i++) target = join(TRASH, `${name}--${stamp()}-${i}`);
  renameSync(src, target);
  return target;
}

// ---------------------------------------------------------------------------
// State

/**
 * managed   - profile/ belongs to a library entry (marker matches)
 * none      - nothing active and profile/ is empty
 * unsaved   - profile/ has content that is not in the library (no marker, or marker
 *             points to a missing entry). Needs a decision before it is overwritten.
 */
function state() {
  const marker = readMarker();
  if (marker && isDir(libPath(marker))) return { kind: 'managed', name: marker };
  if (hasContent()) return { kind: 'unsaved', name: null, staleMarker: marker };
  return { kind: 'none', name: null, staleMarker: marker };
}

/** First run: library empty but profile/ has content -> adopt it automatically. */
function init({ adoptAs } = {}) {
  mkdirSync(LIBRARY, { recursive: true });
  if (libraryNames().length || !hasContent()) return;
  const marker = readMarker();
  const name = adoptAs ?? (marker && SLUG.test(marker) ? marker : 'default');
  mirror(ACTIVE, libPath(name));
  writeMarker(name);
  if (!adoptAs) console.log(`Saved your current profile as "${name}".`);
}

/** Mirror the active profile back into the library. */
function sync() {
  const s = state();
  if (s.kind === 'managed') mirror(ACTIVE, libPath(s.name));
  return s;
}

function unsavedStop(action) {
  const s = state();
  const why = s.staleMarker
    ? `profile/ is marked "${s.staleMarker}", but that profile is not in the library`
    : 'profile/ has content that is not saved as a profile';
  return new Stop(
    `Cannot ${action}: ${why}.\n`
    + 'Ask the user, then either:\n'
    + '  save <name>   keep it as a profile, then retry\n'
    + '  --discard     rerun this command with --discard to move it to the trash and continue',
    2,
  );
}

/** Make sure profile/ can be overwritten (synced, empty, or explicitly discarded). */
function prepareToReplace(action, discard) {
  const s = sync();
  if (s.kind !== 'unsaved') return;
  if (!discard) throw unsavedStop(action);
  mkdirSync(TRASH, { recursive: true });
  const target = join(TRASH, `unsaved--${stamp()}`);
  cpSync(ACTIVE, target, { recursive: true });
  rmSync(join(target, MARKER), { force: true });
  clearDir(ACTIVE);
  console.log(`Moved unsaved profile/ content to ${target}`);
}

function activate(name) {
  mirror(libPath(name), ACTIVE);
  writeMarker(name);
}

function requireProfile(name) {
  checkName(name);
  if (!isDir(libPath(name))) {
    const all = libraryNames();
    throw new Stop(`No profile named "${name}". Profiles: ${all.length ? all.join(', ') : '(none)'}.`);
  }
}

// ---------------------------------------------------------------------------
// Commands

const commands = {
  list() {
    const s = sync();
    const names = libraryNames();
    if (!names.length) console.log('No saved profiles yet.');
    for (const name of names) {
      const about = readAbout(libPath(name));
      console.log(`${name === s.name ? '*' : ' '} ${name}${about ? ` - ${about}` : ''}`);
    }
    if (s.kind === 'unsaved') console.log('! profile/ has unsaved content (not in the library).');
    const trash = trashEntries();
    if (trash.length) console.log(`Trash: ${trash.join(', ')}`);
  },

  current() {
    const s = sync();
    if (s.kind === 'managed') console.log(s.name);
    else if (s.kind === 'unsaved') console.log('(unsaved) profile/ has content that is not in the library');
    else console.log('(none)');
  },

  save(args) {
    const name = args[0] ? checkName(args[0]) : null;
    const s = state();
    if (!name) {
      if (s.kind === 'unsaved') throw unsavedStop('save');
      if (s.kind === 'none') throw new Stop('Nothing to save: no active profile.');
      sync();
      console.log(`Saved "${s.name}".`);
      return;
    }
    if (s.kind === 'managed' && s.name === name) { sync(); console.log(`Saved "${name}".`); return; }
    if (isDir(libPath(name))) throw new Stop(`A profile named "${name}" already exists.`);
    if (s.kind === 'none') throw new Stop('Nothing to save: profile/ is empty.');
    sync();
    mirror(ACTIVE, libPath(name));
    writeMarker(name);
    console.log(s.kind === 'managed'
      ? `Saved a copy of "${s.name}" as "${name}". "${name}" is now active.`
      : `Saved profile/ as "${name}". "${name}" is now active.`);
  },

  switch(args, flags) {
    const name = args[0];
    requireProfile(name);
    if (state().name === name) { sync(); console.log(`"${name}" is already active.`); return; }
    prepareToReplace(`switch to "${name}"`, flags.discard);
    activate(name);
    console.log(`Switched to "${name}".`);
  },

  new(args, flags) {
    const name = checkName(args[0]);
    if (isDir(libPath(name))) throw new Stop(`A profile named "${name}" already exists.`);
    if (flags.from) requireProfile(flags.from);
    prepareToReplace(`create "${name}"`, flags.discard);
    if (flags.from) cpSync(libPath(flags.from), libPath(name), { recursive: true });
    else mkdirSync(libPath(name), { recursive: true });
    activate(name);
    console.log(flags.from
      ? `Created "${name}" as a copy of "${flags.from}". "${name}" is now active.`
      : `Created blank profile "${name}". It is now active and needs profile setup.`);
  },

  rename(args) {
    const [from, to] = args;
    requireProfile(from);
    checkName(to, 'new name');
    if (isDir(libPath(to))) throw new Stop(`A profile named "${to}" already exists.`);
    const s = sync();
    renameSync(libPath(from), libPath(to));
    if (s.name === from) writeMarker(to);
    console.log(`Renamed "${from}" to "${to}".`);
  },

  describe(args) {
    const [name, ...words] = args;
    requireProfile(name);
    const text = words.join(' ').trim();
    if (!text) throw new Stop('Missing description text.');
    const s = sync();
    const dir = s.name === name ? ACTIVE : libPath(name);
    writeFileSync(join(dir, ABOUT), `<!-- One line describing this profile. Used to pick the right profile. -->\n${text}\n`);
    sync();
    console.log(`Described "${name}": ${text}`);
  },

  delete(args, flags) {
    const name = args[0];
    requireProfile(name);
    const s = sync();
    if (s.name === name) throw new Stop(`"${name}" is active. Switch to another profile first.`);
    if (libraryNames().length <= 1) throw new Stop(`"${name}" is the only profile; it cannot be deleted.`);
    if (!flags.yes) {
      console.log(`Would move "${name}" to the trash. Confirm with the user, then rerun with --yes.`);
      process.exitCode = 2;
      return;
    }
    const target = moveToTrash(libPath(name), name);
    console.log(`Moved "${name}" to the trash (${target}). Restore with: restore ${name}`);
  },

  restore(args, flags) {
    const name = args[0];
    if (!name) throw new Stop('Missing profile name.');
    const matches = trashEntries().filter((f) => f === name || f.startsWith(`${name}--`));
    if (!matches.length) throw new Stop(`Nothing named "${name}" in the trash.`);
    const entry = matches.at(-1); // newest (timestamps sort)
    const target = checkName(flags.as ?? name.split('--')[0], 'restore name');
    if (isDir(libPath(target))) {
      throw new Stop(`A profile named "${target}" already exists. Rerun with --as <other-name>.`);
    }
    sync();
    renameSync(join(TRASH, entry), libPath(target));
    console.log(`Restored "${entry}" as "${target}".`);
  },

  'empty-trash'(_args, flags) {
    const trash = trashEntries();
    if (!trash.length) { console.log('The trash is empty.'); return; }
    if (!flags.yes) {
      console.log(`Would permanently delete: ${trash.join(', ')}. Confirm with the user, then rerun with --yes.`);
      process.exitCode = 2;
      return;
    }
    rmSync(TRASH, { recursive: true, force: true });
    console.log(`Permanently deleted ${trash.length} item(s) from the trash.`);
  },
};

// ---------------------------------------------------------------------------
// Main

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    from: { type: 'string' },
    as: { type: 'string' },
    discard: { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
const [command = 'help', ...args] = positionals;

if (flags.help || command === 'help' || !commands[command]) {
  const usage = readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/Usage:[\s\S]*?Exit codes[^\n]*/)[0];
  console.log(usage.replace(/^ \* ?/gm, ''));
  process.exit(command === 'help' || flags.help ? 0 : 1);
}

try {
  // "save <name>" on a fresh library adopts profile/ under the chosen name.
  init({ adoptAs: command === 'save' && args[0] && SLUG.test(args[0]) ? args[0] : undefined });
  commands[command](args, flags);
} catch (error) {
  if (!(error instanceof Stop)) throw error;
  console.error(error.message);
  process.exit(error.code);
}
