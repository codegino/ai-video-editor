---
name: profile-manager
description: Manage the user's editing profiles in this repo (style, rules, vocabulary, intro, outro, branding as one bundle). Use when the user wants to list, check, save, switch, create, copy, rename, describe, delete, or restore a profile, or empty the profile trash, e.g. "what profiles do I have", "switch to my landscape profile", "make a landscape version of this", "new profile for my cooking channel", "delete the old one", "bring it back". Also used by vlog-editor to save after profile edits and to pick the right profile for an edit.
---

# profile-manager

Users keep several complete profiles (one per brand, format, or anything else) and
switch between them by talking. Speak plainly; the user never needs to know the
commands or folders below.

## How it works

| Path | Purpose |
| --- | --- |
| `profile/` | The **active** profile. Everything else (vlog-editor, `tools/transcribe.mjs`) reads only this. |
| `profile/.profile-name` | Marker: which saved profile is active. Never edit it by hand. |
| `profile/about.md` | One-line description of the profile, used to pick the right one. |
| `profiles/<name>/` | The library: one folder per saved profile. |
| `profiles/.trash/` | Deleted profiles, restorable until the trash is emptied. |

**All changes go through `node tools/profile.mjs <command>`** (run from the repo
root). Never copy, move, or delete profile folders yourself: the script syncs
`profile/` back into the library first, so nothing is lost, and it works the same
on every OS. The first run adopts an existing `profile/` as `default` automatically.

| User says (examples) | Command |
| --- | --- |
| "what profiles do I have", "which one am I on" | `list` / `current` |
| "save" (rarely needed; saving is automatic) | `save` |
| "save this as X" | `save <name>` (copy of the active one, becomes active) |
| "switch to X", "use my X profile" | `switch <name>` |
| "new profile X", "make a landscape version of this" | `new <name>` or `new <name> --from <name>` |
| "rename X to Y" | `rename <old> <new>` |
| "X is for …", "describe this profile as …" | `describe <name> <text>` |
| "delete X" | `delete <name>`, then `delete <name> --yes` after confirming |
| "bring X back", "restore X" | `restore <name>` (`--as <new>` if the name is taken) |
| "empty the trash" | `empty-trash`, then `empty-trash --yes` after confirming |

Exit code 2 means the script needs a decision from the user. Read its message, ask,
then act.

## Names

- Stored names are lowercase-kebab-case: `default`, `brand-x-landscape`. Turn what
  the user says into a slug ("My Cooking Channel" becomes `my-cooking-channel`) and
  tell them the name you used.
- When the user refers to a profile, run `list` and match by name and description:
  - one plausible match: use it and say which one ("Switched to `brand-x-landscape`.");
  - several: ask which one, listing them with their descriptions;
  - none: offer to create it.

## Creating a profile

Decide from context and confirm when unclear ("Start from scratch, or copy
`<current>`?"):

- **A variant** of the current profile (landscape version, a YouTube version, same
  brand with a different look): `new <name> --from <current>`, then change only what
  differs. For example, update the format in `profile/style.md`.
- **A new brand or channel**: `new <name>` (blank), then run **Profile setup** from
  the vlog-editor skill. Do not rerun `setup.mjs`.

Afterwards, always `describe` the new profile in one line covering brand, format and
use, e.g. "Brand X, horizontal 16:9, YouTube long-form". Suggest the text and let
the user adjust it.

## Delete, restore, trash

- Before `delete`, say the exact name back and get a yes. Then run with `--yes`.
- The active profile cannot be deleted: ask which profile to switch to first.
- The last remaining profile cannot be deleted.
- Deleted profiles go to the trash and can be restored. Tell the user that.
- `empty-trash` is permanent: list what is in it and get an explicit yes first.

## Unsaved content

If the script says `profile/` has unsaved content (no marker, or a marker for a
missing profile, e.g. files were copied in by hand), never overwrite it silently.
Ask the user:

- **Keep it**: `save <name>`, then retry the original command.
- **Throw it away**: rerun the original command with `--discard`. The content
  goes to the trash, so it can still be restored.

## After every change

Confirm in one short line what happened and which profile is now active. Do not
show commands or paths unless the user asks.
