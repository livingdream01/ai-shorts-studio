#!/usr/bin/env node
/**
 * render — assemble a vertical video from a storyboard, with no API keys required.
 *
 * Produces build/<id>/episode.mp4 (1080x1920, captions burned in). If the macOS
 * `say` command is available it also adds a voiceover. Avatar/video providers are
 * intentionally out of scope here — those are plugged in via the storyboard shots.
 *
 *   node scripts/render.mjs            # newest storyboard under build/
 *   node scripts/render.mjs 001
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, config } from "./lib/config.mjs";
import { tts, caps } from "./lib/providers.mjs";

const cfg = config();
const buildRoot = join(ROOT, "build");
const arg = process.argv[2];

function findBuild() {
  const dirs = readdirSync(buildRoot).filter((d) => existsSync(join(buildRoot, d, "storyboard.json")));
  if (!dirs.length) throw new Error("no build/*/storyboard.json — run: npm run generate");
  if (arg) return dirs.find((d) => d.includes(arg)) || dirs[0];
  return dirs.sort((a, b) => statSync(join(buildRoot, b)).mtimeMs - statSync(join(buildRoot, a)).mtimeMs)[0];
}

const id = findBuild();
const dir = join(buildRoot, id);
const sb = JSON.parse(readFileSync(join(dir, "storyboard.json"), "utf-8"));

const toSrtTime = (t) => {
  const ms = Math.floor((t % 1) * 1000);
  const s = Math.floor(t) % 60, m = Math.floor(t / 60) % 60, h = Math.floor(t / 3600);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
};

// --- voice ---
const wav = join(dir, "voice.wav");
if (!existsSync(wav)) {
  try { tts({ text: sb.script, outWav: wav, voice: sb.voice }); }
  catch (e) { console.warn(`[render] TTS skipped: ${e.message}`); }
}
const hasAudio = existsSync(wav);

function probeDuration(file) {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file]).toString().trim();
    return parseFloat(out) || 0;
  } catch { return 0; }
}
const duration = hasAudio ? Math.max(probeDuration(wav), 8) : sb.captions.length * 2.2;

// --- captions (SRT) ---
const per = duration / Math.max(sb.captions.length, 1);
const srt = sb.captions
  .map((c, i) => `${i + 1}\n${toSrtTime(i * per)} --> ${toSrtTime((i + 1) * per - 0.15)}\n${c}\n`)
  .join("\n");
const srtPath = join(dir, "captions.srt");
writeFileSync(srtPath, srt);

const out = join(dir, "episode.mp4");

if (!caps.ffmpeg()) {
  console.log(`[render] ffmpeg not found. Storyboard + captions are ready in build/${id}/.`);
  console.log(`         Install ffmpeg, then re-run: npm run render`);
  process.exit(0);
}

const style = "FontName=Helvetica,FontSize=20,Bold=1,PrimaryColour=&H00FFFFFF,BorderStyle=3,OutlineColour=&H66000000,Alignment=2,MarginV=140";
const base = ["-y", "-f", "lavfi", "-i", `color=c=0x0F172A:s=1080x1920:d=${duration.toFixed(2)}`];
if (hasAudio) base.push("-i", wav);

const withSubs = ["-vf", `subtitles=${srtPath}:force_style='${style}'`];
const noSubs = ["-vf", "null"];
const audioMap = hasAudio ? ["-map", "0:v", "-map", "1:a", "-shortest"] : [];

function attempt(filters) {
  const args = [...base, ...filters, ...audioMap, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
    ...(hasAudio ? ["-c:a", "aac", "-b:a", "128k"] : []), out];
  execFileSync("ffmpeg", args, { stdio: "pipe" });
}

try {
  attempt(withSubs);
  console.log(`[render] ${id} → build/${id}/episode.mp4 (${duration.toFixed(1)}s, captions + ${hasAudio ? "voice" : "silent"})`);
} catch {
  console.warn("[render] this ffmpeg build has no 'subtitles' filter (needs libass + freetype).");
  console.warn("        Local fix:  brew install ffmpeg   (a full build)  — or rely on CI.");
  attempt(noSubs);
  console.log(`[render] ${id} → build/${id}/episode.mp4 (${duration.toFixed(1)}s, no burn-in; captions at captions.srt)`);
}
