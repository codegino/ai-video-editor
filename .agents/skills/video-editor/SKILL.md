---
name: video-editor
description: Personal AI video editor for this repo. Use when the user says "start" or wants first-time setup; says "edit this" or drops a video into input/; gives notes on a draft ("faster", "bigger captions", "approved", "final"); asks for a horizontal or YouTube cut; or wants to change their style, rules, intro, outro, or vocabulary. Runs setup.mjs, transcribes with Groq (or local Whisper), edits with the Herk Edit Kit in engine/, renders to output/, and keeps the user's preferences in profile/.
---

# video-editor

The user films; you are their editor. Speak plainly, in whatever language they use.
Avoid editing and coding jargon. Unless a step says
otherwise, run commands from the repo root.

## Where things live

| Path | Purpose |
| --- | --- |
| `setup.mjs` | First-run installer. Safe to run again. |
| `tools/transcribe.mjs` | Word-timed transcription: Groq by default, `--local` for faster-whisper. |
| `tools/cues.mjs` | Finds spoken "Direk AI" commands in a transcript. See **Direk AI commands**. |
| `tools/inputs.mjs` | Lists what is in `input/`: kind, length, orientation, recording time, whether used. |
| `input/` | One flat folder for everything: recordings, b-roll, images, music, effects. Subfolders are optional; their names are only hints. |
| `output/` | Results only: `<slug>-v1.mp4`, `<slug>-final.mp4`, `.srt`. **Write-only.** |
| `profile/style.md` | The user's look and feel, written by style setup. |
| `profile/rules.md` | Lasting rules learned from their notes. |
| `profile/vocabulary.md` | Names and terms that improve transcription spelling. |
| `profile/intro.md`, `profile/outro.md` | Optional opening and closing segments. |
| `profile/` (other files) | Brand assets: logo, intro/outro clips, stings. |
| `profile/about.md` | One-line description of this profile (brand, format, use). |
| `profile.example/` | Templates showing the format of each profile file. |
| `profiles/`, `tools/profile.mjs` | Saved profiles and the script that switches them. See **Profiles**. |
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
- Never modify or delete the user's originals in `input/` or `profile/`. Saving,
  switching and deleting profiles goes only through `tools/profile.mjs`.
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
4. If `profile/style.md` is missing, run **profile setup** below. (If the user just
   created a blank profile with the profile-manager skill, skip steps 1–3.)
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
3. Sound: none, a sting file (in `profile/` or `input/`), or a simple
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

**Name it.** If `node tools/profile.mjs current` shows no saved profile, ask: "Name
this profile? (default: `default`)" and run `node tools/profile.mjs save <name>`.
Then `describe` it in one line (brand, format, use), e.g. "My channel, vertical
9:16, Reels and Shorts". Otherwise just run `node tools/profile.mjs save`.

## Profiles

The user can keep several complete profiles (per brand, format, or anything else).
Everything about listing, switching, creating, renaming, deleting and restoring
them is in the **profile-manager** skill at `.agents/skills/profile-manager/SKILL.md`.
Read it when the user talks about profiles. Two rules apply everywhere:

- **After writing any file in `profile/`** (style, rules, intro, outro, vocabulary,
  brand assets), run `node tools/profile.mjs save`.
- **Never copy, move or delete profile folders yourself.**

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

1. **Pick the sources.** See **Reading input/** below. If the user attached a video
   but you cannot see a path, ask them to put it in `input/`. Never read media from
   `output/`. Slug: first main clip's file name plus today's date, lowercase
   kebab-case.
2. **Make the project.** From `engine/`: `npm run new-video -- <slug>`. Write
   `engine/video-projects/<slug>/sources.json` (format in `tools/inputs.mjs`) listing
   every input file used, its role and, for main clips, the order. Build
   `engine/video-projects/<slug>/assets/raw.mp4`:
   - One main clip: copy it (transcode with ffmpeg if it is not MP4).
   - Several: normalize each to the same resolution, frame rate and audio format,
     then join them in order with ffmpeg. Fit clips that don't match the profile's
     format: crop talking-head footage to the face; put screen recordings over a
     blurred fill so nothing is cut off.
3. **Transcribe.** From the repo root:
   `node tools/transcribe.mjs engine/video-projects/<slug>/assets/raw.mp4`
   (add `--local` if `.env` has no Groq key). This produces `raw.json` and takes the
   place of the engine's ElevenLabs step. Then run
   `node tools/cues.mjs engine/video-projects/<slug>/assets/raw.json` and handle any
   commands as **Direk AI commands** below describes.
4. **Load preferences.** Run `node tools/profile.mjs list` and tell the user in one
   line which profile you are using ("Editing with profile `default`."). If the
   request clearly fits another profile better (for example, a YouTube or
   horizontal cut while the active profile is vertical, judged from the `about`
   lines), ask "Switch to `<name>` for this?" and switch only on a yes. Never
   switch silently. Then read `profile/style.md`, `profile/rules.md`, and the intro
   and outro files if they exist. Priority: chat notes > spoken Direk AI commands >
   rules > style > engine house style.
5. **Edit.** Read `engine/AGENTS.md`, then follow the engine skill `short-form-edit`
   for vertical or short videos (under about 3 minutes) or `edit-video` for long
   horizontal ones.
   - B-roll and images: use a clip or image from `input/` only when it matches what
     is said (by file name or content) or the user asked for it. Follow any chat
     instruction about which clip goes where. Old assets that don't fit this video
     stay out.
   - Music and effects: audio files in `input/`, picked per the style. If there are
     none, use simple generated effects or none, as the style says.
   - Add the intro and outro per the rules above.
   - Add any b-roll, images or audio you used to `sources.json`.
6. **Deliver.** Render a draft to `output/<slug>-v1.mp4` with a matching `.srt`. Open
   it. Summarize what you did in 3–5 short bullets, including which clips and
   assets were used or dropped, and ask for notes. If there were Direk AI commands,
   add a short list: time, what was said, what you did (or that you skipped it as
   normal speech).

## Direk AI commands

While recording, the user can talk to you by saying **"Direk AI"** followed by an
instruction in any words or language, e.g. "Direk AI, cut that, I'll say it
again", "Direk AI, put a title card at the bottom", "Direk AI, show the beach
clip in the upper right".

- **Find them** with `tools/cues.mjs` (step 3). It lists each command with its
  time, about 10 s of context on each side, and the range to cut. Cues marked
  "heard differently" may be ordinary speech: judge from context and skip ones
  that are not instructions to you.
- **Treat each one like a chat instruction**, tied to that moment. Read it in
  context: "cut that, I'll say it again" is about what came just before (work out
  where the mistake starts, usually where the retake repeats it); "put a card" is
  about what comes just after. If the user describes the content, build exactly
  that; otherwise infer it from what they say. Use your normal editing abilities;
  there is no fixed command list.
- **Always cut the command itself** (the `cut` range: wake phrase, instruction and
  the pauses around it), even when you skip or can't do the instruction.
- **Ask only when you truly can't infer** what the user meant. Collect every such
  command into **one** message before rendering (time + what they said + your best
  guess), wait for the answer, then continue. If everything is clear, don't pause.
  Paid or uploading services still need approval as usual.
- **Scope:** a spoken command applies to that video and moment only. Chat notes on
  a draft override it. Save it as a rule only if the user says so ("always",
  "from now on", or the same in their language), following **Notes and rules**.

## Reading input/

`input/` is one flat folder. Never ask the user to sort files into subfolders; work
out what each file is. Run `node tools/inputs.mjs` (add `--all` to see used clips).

- **Kinds** come from the file type. Audio length suggests the use: up to about 3 s
  is an effect, about 3–30 s a sting, longer is music. File names override this.
- **Shared vs used.** B-roll, images and audio stay available to every edit and
  keep the role they had before (`was …` in the list). A video becomes **used**
  once a project lists it as a main clip (or older projects were built from it).
  The batch for a new edit is the **new** videos.
- **Explicit instructions win.** If the message names files, order or roles, use
  exactly that. Skip inference and questions.

**Roles.** All new videos in the batch belong to **one edit** by default:

- **Main clip**: someone talking, with sound, in a consistent camera and format.
- **B-roll**: short, little or no speech, or clearly a different source. Names
  like `broll`, `cutaway`, or a subfolder name add weight.
- **Retake**: covers the same lines as another main clip (compare transcripts;
  transcribe each clip on its own first when there are several). Keep the **last
  complete take**, mark earlier ones `retake` in `sources.json`. Never delete them.

**Order** of main clips: descriptive names first (`1-intro`, `part-2`, …), then
recording time (`recordedAt`), then the camera's file numbering. Use the
transcripts only to break ties or catch something clearly out of place (an
"in this video…" opening recorded last).

**Format.** The active profile decides the output format. Clips that don't match
are fitted (step 2). Only if most of the main footage doesn't match, ask the usual
"Switch to `<name>` for this?" from step 4.

**How much to ask:**

- **One new video**: no questions. Just edit it.
- **Several, and the roles and order are clear**: state the plan in one line and
  keep going, e.g. "Joining `intro.mp4` → `main.mp4`, `beach.mp4` as b-roll,
  dropped `IMG_0615` as a retake." The user can correct it in their notes.
- **Several, and something is unclear** (order can't be told, roles conflict,
  takes differ a lot): send **one** message with your full proposed plan and mark
  the unclear parts, so "go" or a single correction settles it. Ask at most once,
  then proceed.

## Notes and rules

- Apply each note, render the next version (`-v2`, `-v3`, …) from the project, not
  from the previous render, and open it.
- When a note is lasting (says always or never, is about style, or the same kind of
  note comes twice), add it to `profile/rules.md`: one line with the rule, the user's
  exact words, and the date. Confirm with: "Saved as a rule: …".
- Changes to intro, outro or vocabulary go into those profile files, not rules.
- After any of these profile writes, run `node tools/profile.mjs save`.
- Never write preferences into `engine/`; setup can replace it.
- On approval ("approved", "final"), render at final quality to
  `output/<slug>-final.mp4`.
- "Horizontal version" or "for YouTube": a real 1920×1080 composition with its own
  framing and text placement, as `short-form-edit` describes, not a crop.

## Never

- Post, upload or send a video anywhere.
- Print, log or ask for the Groq key.
- Commit anything in `input/`, `output/`, `profile/`, `profiles/`, or `.env`.
