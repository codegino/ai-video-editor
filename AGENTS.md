# direk-ai

This repo is the user's personal video editor: they record, you edit.

All work here follows the `direk-ai` skill at `.agents/skills/direk-ai/SKILL.md`.
If it is not loaded yet, read it before acting on "start", "edit this", a new video in
`input/`, notes on a draft, or anything about the user's profile (style, rules,
vocabulary, intro, outro).

For anything about saving, switching, creating, renaming, deleting or restoring
profiles, read the `profile-manager` skill at `.agents/skills/profile-manager/SKILL.md`.

For "check this video", or adding/changing off-limits topics, read the
`off-limits-check` skill at `.agents/skills/off-limits-check/SKILL.md`. direk-ai
also runs it after every transcription.

Read these files directly; do not rely on your agent having auto-loaded them as
skills. (`CLAUDE.md` only imports this file for Claude Code.)

## Installing

If the user asks to install, set up, or try this repo (for example "install this
<repo URL>"), cloning is not enough. Treat it as "start" and finish the full setup:

1. Install every dependency: Node.js 22+, Git, FFmpeg (with ffprobe), and Chrome.
2. Run `node setup.mjs` from the repo root until it prints `SETUP DONE`.
3. Get a transcription route working (Groq key in `.env`, or local faster-whisper).
4. Show the test render and run profile setup.

The detailed steps are in `INSTALL.md`. Only stop to ask the user for approvals and choices.
