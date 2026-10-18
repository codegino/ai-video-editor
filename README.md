# ai-vlog-editor

Your own AI video editor, living inside the coding agent you already use (Claude Code,
Codex, Cursor, Gemini CLI, GitHub Copilot, Windsurf, or anything that reads
[Agent Skills](https://agentskills.io)).

Record yourself, drop the file in `input/`, and say **"edit this"**. You get a cut,
captioned draft with motion graphics, zooms and sound. Reply with notes in plain
words, in your own language. Notes you repeat become rules, so every edit gets closer
to your style.

Transcription runs on [Groq](https://console.groq.com/keys)'s free Whisper API, which
handles non-English and mixed-language speech well. A fully local option is there if you prefer.

## Setup

1. Clone this repo and open the folder in your agent.
2. Type **`start`**.

The agent checks your tools, installs the editing engine, renders a test clip, helps you
pick a transcription route, and asks a few questions to build your profile: format,
captions, pace, an optional intro and outro, and words Whisper should spell your way.

Open your agent in this folder from then on so it finds the `vlog-editor` skill.

## Editing

1. Put a video in `input/`, or drag it into the chat.
2. Say **"edit this"** (or `/vlog-editor`, or `$vlog-editor` in Codex).
3. Watch the draft in `output/`, give notes, repeat. Say **"final"** when done.

Want a YouTube version? Ask for horizontal. It gets its own framing, not a crop.

## Folders

```
input/              your raw videos (top level)
  b-roll/           extra clips to cut in, matched to what you say
  images/           screenshots, photos
  audio/            music and sound effects
output/             drafts, finals and subtitles (results only, never reused as input)
profile/            you: style, rules, vocabulary, intro, outro, logo
profile.example/    templates for every profile file
engine/             the editing engine, installed by setup (do not edit)
tools/              transcription scripts
```

`input/`, `output/`, `profile/` and `.env` stay on your computer and are never committed.

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
