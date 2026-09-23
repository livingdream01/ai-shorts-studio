# Architecture

```
content/<id>.yml        one episode: hook, script, captions, shots
        │
        ▼  scripts/generate.mjs        (optional LLM polish)
build/<id>/storyboard.json
        │
        ▼  scripts/render.mjs          voice (say/API) + ffmpeg assembly
build/<id>/episode.mp4   +  captions.srt
        │
        ▼  scripts/publish.mjs         Postiz or IG Graph API
content/log.csv
        │
        ▼  .github/workflows/daily.yml cron daily
```

## Design choices

- **Local-first, zero required keys.** With nothing configured the pipeline still
  produces a real MP4 (macOS `say` + ffmpeg). Providers are opt-in via `.env`.
- **Content is data.** Episodes are YAML; the code is generic. You write the hook
  and script; the pipeline does the rest.
- **Publish is dry-run by default.** `PUBLISH=true` + credentials are required to
  actually post. This is deliberate — it prevents accidental posts.
- **CI is the server.** A GitHub Actions cron is the "runs without me" piece: a
  machine that never sleeps, with secrets, at no cost.

## Where the AI models plug in

`render.mjs` builds a solid base video. To make it cinematic, replace the flat
background with generated shots from the storyboard's `shots[]`:

- **Stills / b-roll:** ComfyUI (Flux/SDXL) or Wan2.1 / CogVideo.
- **Talking head:** LivePortrait → Wav2Lip / LatentSync.
- **Multi-character dialogue:** MultiTalk / EchoMimic.

See the vault note `Tool Stack` for repos. Adapters live in `scripts/lib/providers.mjs`.

## Known limit

ffmpeg must include `libass` + `freetype` to burn captions. macOS Homebrew builds
sometimes omit them (the pipeline falls back gracefully and writes `captions.srt`).
CI uses Ubuntu, whose ffmpeg has them.
