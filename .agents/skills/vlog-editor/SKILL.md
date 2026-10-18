---
name: vlog-editor
description: Personal AI video editor for this repo. Use when the user says "start" or wants first-time setup; says "edit this" or drops a video into input/; gives notes on a draft ("faster", "bigger captions", "approved", "final"); asks for a horizontal or YouTube cut; or wants to change their style, rules, intro, outro, or vocabulary. Runs setup.mjs, transcribes with Groq (or local Whisper), edits with the Herk Edit Kit in engine/, renders to output/, and keeps the user's preferences in profile/.
---

# vlog-editor

The user films; you are their editor. Speak plainly, in whatever language they use.
Avoid editing and coding jargon. Unless a step says
otherwise, run commands from the repo root.

## Where things live

| Path | Purpose |
| --- | --- |
| `setup.mjs` | First-run installer. Safe to run again. |
| `tools/transcribe.mjs` | Word-timed transcription: Groq by default, `--local` for faster-whisper. |
| `input/` | Main videos to edit go at the top level. |
| `input/b-roll/` | Extra clips to cut in. Shared by every edit. |
| `input/images/` | Screenshots, photos, graphics for the current work. Shared. |
| `input/audio/` | Music and sound effects. Shared. |
| `output/` | Results only: `<slug>-v1.mp4`, `<slug>-final.mp4`, `.srt`. **Write-only.** |
| `profile/style.md` | The user's look and feel, written by style setup. |
| `profile/rules.md` | Lasting rules learned from their notes. |
| `profile/vocabulary.md` | Names and terms that improve transcription spelling. |
| `profile/intro.md`, `profile/outro.md` | Optional opening and closing segments. |
| `profile/` (other files) | Brand assets: logo, intro/outro clips, stings. |
| `profile.example/` | Templates showing the format of each profile file. |
| `engine/` | Herk Edit Kit, installed by setup. **Never modify it.** |

The engine has its own guide (`engine/AGENTS.md`) and skills under
`engine/.agents/skills/<name>/SKILL.md`. Paths inside engine docs are relative to
`engine/`, so run engine commands from there.

Setup and Groq calls need the internet. If your sandbox blocks network access
(Codex does by default), ask the user to approve it for those commands.

## Source rules

- **Never use anything in `output/` as source material.** Every new version is
  rebuilt from the original in `input/` and the project in
  `engine/video-projects/<slug>/`, never by re-editing an earlier render.
- Never modify or delete the user's originals in `input/` or `profile/`.
- Engine features like AI-generated visuals, screen captures and drawn graphics
  are allowed. Anything that **costs money or uploads the user's media** (Kie.ai,
  ElevenLabs, any paid API) needs a yes from the user first. Groq transcription is
  already approved by choosing it in setup.
- Ignore the engine's sample brand assets (AIS logo, backgrounds, showcase media).
  Branding comes from `profile/` only.

## "start" (also when `engine/` or `profile/style.md` is missing)

1. Tell the user in one line that you are setting up, then run `node setup.mjs`.
   - Missing tools: show the install command it printed, ask once, run it. Then
     ask the user to restart their agent or terminal and say `start` again.
   - Test render fails: run `npx hyperframes doctor` in `engine/video-projects/demo`,
     fix what it reports (usually Chrome), and rerun setup.
2. If setup reports no transcription route, offer:
   - **Groq (recommended)**: free, fast, and the most accurate, especially for
     non-English or mixed-language speech. The user creates a key at https://console.groq.com/keys and pastes it
     after `GROQ_API_KEY=` in `.env` **themselves**. Never ask for the key in chat
     and never print it.
   - **On this computer**: private, no account. Needs Python and
     `pip install faster-whisper`. Slow without an NVIDIA GPU; first run downloads
     the model.
3. Open `output/setup-test.mp4` for them (`open` on macOS, `start ""` on Windows,
   `xdg-open` on Linux).
4. If `profile/style.md` is missing, run **profile setup** below.
5. Close with: "Put a video in the input folder (or drag it here) and say: edit this."

## Profile setup

Ask short multiple-choice questions, a few at a time. Use your question tool if you
have one; otherwise label options A, B, C so a one-letter reply works. Mark the
recommended option. Use `profile.example/` as the template for every file you write.

**Round 1: format and captions**
- Format: vertical 9:16 for Reels/TikTok/Shorts (default), horizontal 16:9, or both.
- Captions: phrase by phrase, word by word, bold key words, key-word pills,
  full subtitles, or none. Position: upper third (default; clear of app buttons),
  middle, lower third. Colors: white with shadow, a brand color (ask which), or a
  highlight color on key words.

**Round 2: feel**
- Hook text in the first 3 seconds: yes or no.
- Pace: tight (cut every pause) or natural (keep short pauses).
- Graphics: minimal, some motion cards, or heavy.
- Color: natural, warm, cool, black and white, orange and teal.
- Sound: voice only, light sound effects, or effects plus a quiet music bed.

**Round 3: intro and outro** (ask each one separately)
1. Want one? None / generate one for me / I have a ready-made clip.
2. If generating: what text it shows (channel name, tagline, or a call to action
   such as "Follow for more"), whether to use a logo (ask them to put it in
   `profile/`), and length: 1–2 s (recommended for short-form), 3–5 s, or custom.
   If they have a clip: ask them to put it in `profile/` and note the file name.
3. Sound: none, a sting file (in `profile/` or `input/audio/`), or a simple
   generated whoosh.
4. When to use: every video, horizontal/YouTube only (recommended for intros), or
   only videos longer than N seconds.

If the answer is **None**, do not create the file. A missing file means no intro or
outro.

**Round 4: vocabulary**
Ask for their name, brand or channel name, and words they often say that Whisper
might misspell (product names, tech terms, local slang). Write them to
`profile/vocabulary.md`, keeping the explanatory header from the example.

**Preview and save.** If there is a video in `input/`, render a 5-second sample of
the caption style (and the intro, if generated) on their own footage. Show it and
adjust before saving. Write `profile/style.md` as short bullets in the user's own
words where they gave them.

## Intro and outro

`profile/intro.md` and `profile/outro.md` each describe one segment in plain words.
See `profile.example/` for the format. When editing:

- **File missing** → no intro/outro.
- **File present** → follow its `When to use` line. If it has no such line,
  include the segment unless the user says to skip it for this video.
- The user can override either way for a single video ("no intro on this one",
  "add my outro").
- If the file names a ready-made clip in `profile/`, use that clip as-is (scaled
  to the output format). Otherwise build the segment from the description as a
  motion graphic, using the brand assets it lists.
- Captions and the speech cut never overlap the intro or outro.

## "edit this", or a new video in input/

The request approves the full local pipeline: transcription with the configured
route, silence and mistake cuts, design, preview and draft render. Do not pause for
approval between steps. Only stop to ask about paid or uploading services.

1. **Pick the source.** Use the path in the message. Otherwise use the newest video
   at the top level of `input/` with no matching render in `output/`. Only check
   `output/` to see what is done; never read media from it. If the user attached a
   video but you cannot see a path, ask them to put it in `input/`. Slug: file name
   plus today's date, lowercase kebab-case.
2. **Make the project.** From `engine/`: `npm run new-video -- <slug>`. Copy the source
   to `engine/video-projects/<slug>/assets/raw.mp4` (transcode with ffmpeg if it is
   not MP4).
3. **Transcribe.** From the repo root:
   `node tools/transcribe.mjs engine/video-projects/<slug>/assets/raw.mp4`
   (add `--local` if `.env` has no Groq key). This produces `raw.json` and takes the
   place of the engine's ElevenLabs step.
4. **Load preferences.** Read `profile/style.md`, `profile/rules.md`, and the intro
   and outro files if they exist. Priority: rules > style > engine house style.
5. **Edit.** Read `engine/AGENTS.md`, then follow the engine skill `short-form-edit`
   for vertical or short videos (under about 3 minutes) or `edit-video` for long
   horizontal ones.
   - B-roll: the engine matches clips in `input/b-roll/` to what is said. Descriptive
     file names help. Follow any chat instruction about which clip goes where.
   - Images: `input/images/`. Music and effects: `input/audio/`. If it is empty, use
     simple generated effects or none, as the style says.
   - Add the intro and outro per the rules above.
6. **Deliver.** Render a draft to `output/<slug>-v1.mp4` with a matching `.srt`. Open
   it. Summarize what you did in 3–5 short bullets and ask for notes.

## Notes and rules

- Apply each note, render the next version (`-v2`, `-v3`, …) from the project, not
  from the previous render, and open it.
- When a note is lasting (says always or never, is about style, or the same kind of
  note comes twice), add it to `profile/rules.md`: one line with the rule, the user's
  exact words, and the date. Confirm with: "Saved as a rule: …".
- Changes to intro, outro or vocabulary go into those profile files, not rules.
- Never write preferences into `engine/`; setup can replace it.
- On approval ("approved", "final"), render at final quality to
  `output/<slug>-final.mp4`.
- "Horizontal version" or "for YouTube": a real 1920×1080 composition with its own
  framing and text placement, as `short-form-edit` describes, not a crop.

## Never

- Post, upload or send a video anywhere.
- Print, log or ask for the Groq key.
- Commit anything in `input/`, `output/`, `profile/`, or `.env`.
