# direk-ai

Your own AI video editor ("Direk" is Filipino for director), living inside the coding agent you already use (Claude Code,
Codex, Cursor, GitHub Copilot, Windsurf, pi, or anything that reads `AGENTS.md` or
[Agent Skills](https://agentskills.io) in `.agents/skills/`).

Record yourself, drop the file in `input/`, and say **"edit this"**. You get a cut,
captioned draft with motion graphics, zooms and sound. Reply with notes in plain
words, in your own language. Notes you repeat become rules, so every edit gets closer
to your style.

Transcription runs on [Groq](https://console.groq.com/keys)'s free Whisper API, which
handles non-English and mixed-language speech well. A fully local option is there if you prefer.

## Setup

Clone the repo, open the folder in your agent, and say **`start`**. Or just tell your
agent: "install https://github.com/codegino/direk-ai".

The agent installs whatever is missing (see [Requirements](#requirements)), downloads
the editing engine, renders a test clip, helps you pick a transcription route, and
asks a few questions to build your profile. Agents follow [INSTALL.md](INSTALL.md).

## Editing

1. Put a video in `input/`, or drag it into the chat. Several clips are fine: they
   are joined in recording order, retakes are dropped, and extra clips, images and
   audio are used where they fit. No subfolders needed.
2. Say **"edit this"**. Agents that load skills from `.agents/skills/` can also
   invoke it directly (for example `$direk-ai` in Codex).
3. Watch the draft in `output/`, give notes, repeat. Say **"final"** when done.

Want a YouTube version? Ask for horizontal. It gets its own framing, not a crop.

### Talk to Direk AI while you record

Say **"Direk AI"** and an instruction, in any language, and keep filming. The editor
finds these in the transcript, does what you asked at that moment, and cuts the
command out of the video:

- "Direk AI, cut that, I'll say it again"
- "Direk AI, put a title card at the bottom: three tips for better audio"
- "Direk AI, show the beach clip in the upper right"

There is no fixed command list. If it can't tell what you meant, it asks once before
rendering. The draft summary lists every command and what was done.

## Folders

```
input/              everything you film or want used: videos, b-roll, images, music, effects
output/             drafts, finals and subtitles (results only, never reused as input)
profile/            you: style, rules, vocabulary, intro, outro, logo (the active profile)
profiles/           your saved profiles, one folder each (managed for you)
profile.example/    templates for every profile file
engine/             the editing engine, installed by setup (do not edit)
tools/              transcription, input listing, Direk AI command and profile scripts
```

`input/`, `output/`, `profile/`, `profiles/` and `.env` stay on your computer and are never committed.

### Profiles

Keep as many profiles as you like, for example one per brand, or a portrait one and
a landscape one. Just ask: "what profiles do I have", "make a landscape version of
this", "switch to my cooking profile", "rename it", "delete the old one". Changes are
saved automatically, and deleted profiles go to a trash you can restore from. Under
the hood the agent uses `node tools/profile.mjs` (run it with `help` to see the
commands).

### Intro and outro

`profile/intro.md` and `profile/outro.md` describe an opening and closing segment in
plain words, or point to a ready-made clip in `profile/`. A `When to use` line decides
which videos get them, for example only YouTube or every video. No file means none.
Setup can write them for you.

### Vocabulary

`profile/vocabulary.md` lists names, brands and jargon. They are sent to Whisper as a
hint so they come back spelled right. This matters most when you mix languages.

## Requirements

- An agent that can run terminal commands. Editing uses a lot of agent usage.
- Node.js 22+, Git, FFmpeg, Chrome. Setup tells you what is missing.
- Transcription: a free Groq API key, or Python with `pip install faster-whisper`.
- About 1 GB of disk.

## Credits

The editing engine is [Herk Edit Kit](https://github.com/nateherkai/herk-edit-kit)
by Nate Herk. Both are MIT licensed. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
