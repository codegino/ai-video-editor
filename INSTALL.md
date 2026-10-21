# Installing direk-ai (instructions for agents)

You were asked to install or set up this repo. Cloning is not enough: finish every
step below. Do the work yourself, and only stop to ask the user for approvals and choices.

1. Clone https://github.com/codegino/direk-ai into a folder called
   `direk-ai` (skip if already cloned) and move into it.
2. Read `AGENTS.md` and `.agents/skills/direk-ai/SKILL.md`, and follow that skill.
3. Make sure every dependency is installed before going further:
   - Node.js 22 or newer, Git, FFmpeg (including ffprobe), and Google Chrome.
   - Install anything missing with the system's package manager
     (macOS: `brew install node git ffmpeg`; Windows:
     `winget install OpenJS.NodeJS.LTS Git.Git Gyan.FFmpeg`; Linux: apt/dnf/pacman),
     and Chrome from https://www.google.com/chrome if it is not there.
   - If a tool was just installed and is not on PATH yet, ask the user to restart
     the terminal or agent, then continue.
4. Run `node setup.mjs` from the repo root. It downloads the editing engine into
   `engine/`, runs `npm ci` there, and renders a test clip to `output/setup-test.mp4`.
   It needs internet access, so request network permission if your sandbox blocks
   it. Rerun it until it prints `SETUP DONE`. If the test render fails, run
   `npx hyperframes doctor` in `engine/video-projects/demo`, fix what it reports
   (usually Chrome), and rerun setup.
5. Set up transcription. Either:
   - **Groq (recommended):** the user creates a free key at
     https://console.groq.com/keys and pastes it after `GROQ_API_KEY=` in `.env`
     themselves. Never ask for the key in chat and never print it.
   - **Local:** install Python 3 and run `pip install faster-whisper`.

   Rerun `node setup.mjs` and confirm it reports a working transcription route.
6. Open `output/setup-test.mp4` for the user (`open` on macOS, `start ""` on Windows,
   `xdg-open` on Linux), then run the skill's profile setup to ask about their style.
7. Tell the user to open their agent in this folder from now on, so it loads
   `AGENTS.md` (Claude Code loads it through `CLAUDE.md`) and the `direk-ai` skill.
