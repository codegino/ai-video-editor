# Get a free Groq API key

direk-ai uses Groq to transcribe your videos. The free tier is enough for normal use,
and you don't need a credit card.

## Steps

1. Go to https://console.groq.com and sign in. You can use Google, GitHub, or email.
2. Open **API Keys** in the menu, or go straight to https://console.groq.com/keys.
3. Click **Create API Key**, give it a name (for example `direk-ai`), and submit.
4. Copy the key right away. It starts with `gsk_`, and Groq only shows it once.
5. In this repo, open `.env` (copy `.env.example` to `.env` if you don't have one) and
   paste the key after the `=`:

   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

6. Save the file and run `node setup.mjs` again. It should report a working
   transcription route.

## Tips

- Keep the key private. Don't paste it into chat, commit it, or share screenshots of
  it. `.env` is git-ignored.
- If a key leaks, delete it at https://console.groq.com/keys and create a new one.
- Free-tier rate limits apply. If you hit one, wait a bit and retry.
- If you'd rather not use Groq, leave `GROQ_API_KEY` empty and transcribe locally
  with Python 3 and `pip install faster-whisper`.
