# AI Shorts Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20%2B-brightgreen)](https://nodejs.org)
[![ffmpeg](https://img.shields.io/badge/needs-ffmpeg-007808)](https://ffmpeg.org)

An AI-run short-form video studio: **one consistent character, one episode a day.**
Write the hook, and the pipeline turns it into a vertical video — then publishes it.

Built to prove a simple thesis: on Reels/TikTok/Shorts, **consistency of character
and cadence beats production value.** AI removes the need for a camera, a face, and
an editor, so the whole game becomes: *one format, every day, for 90 days.*

## Quick start (no API keys)

```sh
npm install
npm run episode      # generate + render the bundled example episode
open build/001-first-light/episode.mp4
```

That produces a real `1080x1920` MP4 with a voiceover (macOS `say`) and captions.
No accounts, no keys, no cost.

## How it works

```
content/001-first-light.yml      an episode: hook, script, captions, shots
        │  generate.mjs           optional LLM polish
build/001-first-light/storyboard.json
        │  render.mjs             voice + ffmpeg assembly
build/001-first-light/episode.mp4
        │  publish.mjs            Postiz / Instagram Graph API  (dry-run by default)
content/log.csv
```

## Commands

| Command | Does |
|---|---|
| `npm run generate` | build a storyboard from `content/*.yml` |
| `npm run render` | assemble `episode.mp4` (voice + captions) |
| `npm run episode` | generate + render in one step |
| `npm run publish` | send to Instagram (dry-run unless `PUBLISH=true`) |

## Make it cinematic

`render` gives a clean base. To go further, generate the shots listed in the
storyboard and feed them in:

| Want | Tool |
|---|---|
| Cinematic b-roll | [Wan2.1](https://github.com/Wan-Video/Wan2.1) · [CogVideo](https://github.com/zai-org/CogVideo) · ComfyUI |
| Talking head | [LivePortrait](https://github.com/KwaiVGI/LivePortrait) · [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) · [LatentSync](https://github.com/bytedance/LatentSync) |
| Multi-character drama | [MultiTalk](https://github.com/MeiGen-AI/MultiTalk) · [EchoMimic](https://github.com/antgroup/echomimic) |
| Voice | [XTTS](https://github.com/coqui-ai/TTS) · [F5-TTS](https://github.com/SWivid/F5-TTS) · [Kokoro](https://github.com/hexgrad/kokoro) |
| Captions | [Whisper](https://github.com/openai/whisper) |

Full verified list in the vault (`Tool Stack`).

## Publishing

Dry-run by default. To publish, copy `.env.example` → `.env` and choose one:

- **Postiz** (recommended): a self-hostable scheduler, `POSTIZ_URL` + `POSTIZ_API_KEY`.
- **Instagram Graph API**: `IG_ACCESS_TOKEN` + `IG_USER_ID` + a public `MEDIA_URL_BASE`.

Then `PUBLISH=true npm run publish`. In CI, add the same values as repo secrets and
the daily workflow publishes for you.

## Runs without you

`.github/workflows/daily.yml` runs the pipeline on a **daily cron** (and on demand),
renders the episode, uploads it as an artifact, and publishes when enabled. That
cron is the piece that makes it "a studio" instead of "a script".

## Honest limits

- ffmpeg must have `libass` + `freetype` to burn captions. Some macOS builds don't —
  the pipeline falls back and still writes `captions.srt`. CI (Ubuntu) burns them in.
- Publishing needs **your** Instagram account and a token. Nothing here logs in for
  you — by design.
- Characters need a locked reference image + LoRA for consistency; that's the real work.
- Disclose AI. Every episode's caption includes a disclosure line. See the vault's
  `Ethics & AI Disclosure`.

## License

MIT. The character, scripts and output are yours.
