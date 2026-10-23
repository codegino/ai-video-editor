---
name: off-limits-check
description: Check what the user says in a video against their off-limits topics (profile/off-limits.md) and warn them about anything that crosses a line. Use when the user says "check this video", "check my script", "check for red topics", "is this okay to post", "anything off-limits in here", or wants to add, change or remove an off-limits topic ("add politics to my off-limits", "don't flag religion anymore"). Also called by direk-ai right after transcription in every "edit this".
---

# off-limits-check

The user keeps a list of topics they never want in their videos (politics, gender
debates, politically incorrect jokes, …). This skill reads a transcript and warns
them about anything that touches those topics. It **only warns**: it never cuts,
pauses an edit, or changes anything on its own. Speak plainly, in the user's
language.

## Where things live

| Path | Purpose |
| --- | --- |
| `profile/off-limits.md` | The active profile's off-limits topics. Saved and switched with the profile. |
| `profile.example/off-limits.md` | Template showing the format. |
| `tools/transcribe.mjs` | Makes the word-timed transcript (`<video>.json`) next to the video it is given. |

## The check

Input: a word-timed transcript (`{ text, words: [{ text, start, end }] }`). An
attached script works too (no times), but transcripts are the main use.

To keep it light, judge from the plain text, not the word timings (the full
file is ~15× larger). Print just the text:

```bash
node -e 'console.log(require(require("path").resolve(process.argv[1])).text)' <transcript.json>
```

Only after deciding what to flag, look up the time of each hit in `words`
(search for its first few words), e.g.:

```bash
node -e 'const w=require(require("path").resolve(process.argv[1])).words;const q=process.argv[2].toLowerCase().split(/\s+/);for(let i=0;i<w.length;i++)if(q.every((t,k)=>(w[i+k]?.text||"").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"")===t.replace(/[^\p{L}\p{N}]/gu,""))){const s=Math.floor(w[i].start);console.log(`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`)}' <transcript.json> "first few words"
```

The time lookup is the only text matching in this skill. Deciding **what** crosses
a line is always a judgment of meaning (step 2), never a word search.

1. **Read the list.** Read `profile/off-limits.md`. If it is missing or has no
   topics, say one line and stop: "Off-limits check skipped: no off-limits list
   for this profile." Never skip silently.
2. **Judge by meaning, not keywords.** Read the whole text, topic by topic,
   the way a careful human reviewer would. Catch indirect references, sarcasm,
   jokes, and Tagalog/Taglish or any other language. Don't flag harmless uses of
   a word ("I elected to use FFmpeg"). Check everything said, including lines a
   retake or mistake cut may remove later. Spoken "Direk AI" commands themselves
   are never flagged.
3. **Rate each hit:**
   - **Flag**: clearly on an off-limits topic.
   - **Borderline**: a passing mention, a joke that could be read either way, or
     an unclear case (naming a politician in a non-political story).
4. **Report** in chat, recording times (`m:ss`, from the transcript's word
   times), grouped Flags first:

   ```
   Off-limits check: 1 flag, 1 borderline
   - FLAG 2:40 "…exact quote…" (Politics): gives an opinion on the election.
   - BORDERLINE 5:12 "…exact quote…" (Politically incorrect): joke leans on a stereotype.
   ```

   Quote just enough to find the spot (one sentence or so). If nothing is hit:
   `Off-limits check: clean.`

A false flag usually means a topic in `off-limits.md` is worded too broadly. Offer
to tighten the wording rather than keeping a hidden list of exceptions.

## Inside "edit this" (called by direk-ai)

Run the check right after transcription (direk-ai step 3), on
`engine/video-projects/<slug>/assets/raw.json`. Post the report in chat
**immediately** and keep editing without waiting for an answer. In the draft
summary, repeat it in one line ("2 off-limits flags, see above") and offer to cut
them in the next version. If the user says to cut one, it is a normal note on the
draft: rebuild the next version from the project without that part.

## "check this video" / "check my script" (no edit)

Pick what to check without asking:

- A script or text pasted/attached in chat: check that text directly (no times).
- A video path given: check that video.
- Nothing given (any wording: "check my script", "check for red topics", …):
  auto-transcribe the video(s) in `input/` and check them. If there are several,
  check each, newest first. Only ask if `input/` has no video.

Transcribe without leaving anything in `input/` or `output/`:

```bash
tmp=$(mktemp -d)
ln -s "$(cd "$(dirname "<video>")" && pwd)/$(basename "<video>")" "$tmp/"
node tools/transcribe.mjs "$tmp/$(basename "<video>")"    # add --local if .env has no Groq key
```

The transcript is `$tmp/<video-name>.json`. Run the check, report, then delete
`$tmp`. Don't edit or render anything. Recording times are the only times.

## Changing the list

There is no setup question for this; topics are added by asking.

- "Add X to my off-limits", "never mention Y", "stop flagging Z": edit
  `profile/off-limits.md` (create it from `profile.example/off-limits.md` if
  missing), one topic per line with a short description of what it covers.
- Confirm in one line ("Added to off-limits: …"), then run
  `node tools/profile.mjs save`.
- The list belongs to the active profile. If the user wants the change in other
  profiles too, follow the profile-manager skill; never copy profile folders
  yourself.
