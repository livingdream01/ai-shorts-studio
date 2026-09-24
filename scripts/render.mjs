#!/usr/bin/env node
/**
 * render — assemble the episode: voice → avatar → captions → video.
 *
 * Layout: a blurred background + the portrait avatar in the frame + a caption
 * band at the bottom, with an ASS subtitle track rendered at a fixed 1080x1920
 * resolution so captions are sized correctly (SRT defaults scale badly).
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

const probeDuration = (file) => {
  try {
    return parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", file]).toString()) || 0;
  } catch { return 0; }
};

// --- voice ---
const wav = join(dir, "voice.wav");
if (!existsSync(wav)) {
  try { tts({ text: sb.script, outWav: wav, voice: sb.voice }); }
  catch (e) { console.warn(`[render] TTS skipped: ${e.message}`); }
}
const hasAudio = existsSync(wav);
const duration = hasAudio ? Math.max(probeDuration(wav), 8) : sb.captions.length * 2.2;

// --- captions: align to the voice with Whisper, then convert to ASS ---
const srtPath = join(dir, "captions.srt");
if (hasAudio && caps.whisper()) {
  try {
    execFileSync("python3", [join(ROOT, "scripts", "lib", "align.py"), wav, srtPath], { stdio: "pipe" });
  } catch (e) {
    console.warn(`[render] alignment failed: ${String(e.message).split("\n")[0]}`);
  }
}
function parseSrt(text) {
  const cues = [];
  for (const block of text.trim().split(/\n\s*\n/)) {
    const lines = block.split("\n");
    const t = lines.find((l) => l.includes("-->"));
    if (!t) continue;
    const [a, b] = t.split("-->").map((s) => s.trim());
    const toSec = (x) => {
      const [hms, ms] = x.split(",");
      const [h, m, s] = hms.split(":").map(Number);
      return h * 3600 + m * 60 + s + (Number(ms) || 0) / 1000;
    };
    const text2 = lines.filter((l) => l && !l.includes("-->") && !/^\d+$/.test(l)).join(" ");
    if (text2) cues.push({ start: toSec(a), end: toSec(b), text: text2 });
  }
  return cues;
}
let cues = existsSync(srtPath) ? parseSrt(readFileSync(srtPath, "utf-8")) : [];
if (!cues.length) {
  const per = duration / Math.max(sb.captions.length, 1);
  cues = sb.captions.map((c, i) => ({ start: i * per, end: (i + 1) * per - 0.15, text: c }));
}

const ass = (t) => {
  const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = Math.floor(t) % 60, cs = Math.floor((t % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};
const assPath = join(dir, "captions.ass");
writeFileSync(assPath, [
  "[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "WrapStyle: 0", "",
  "[V4+ Styles]",
  "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
  "Style: D,DejaVu Sans,52,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,3,0,2,90,90,200,1", "",
  "[Events]",
  "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
  ...cues.map((c) => `Dialogue: 0,${ass(c.start)},${ass(c.end)},D,,0,0,0,,${c.text.replace(/\n/g, "\\N")}`),
  "",
].join("\n"));

// --- avatar ---
const portrait = join(ROOT, "assets", "wren-ref.png");
const avatarMp4 = join(dir, "avatar.mp4");
if (existsSync(portrait) && caps.wav2lip() && !existsSync(avatarMp4)) {
  console.log("[render] animating the avatar with Wav2Lip (CPU — the slow part)…");
  try { execFileSync("python3", [join(ROOT, "scripts", "lib", "avatar.py"), portrait, wav, avatarMp4], { stdio: "inherit" }); }
  catch (e) { console.warn(`[render] avatar step failed: ${String(e.message).split("\n")[0]}`); }
}
const hasAvatar = existsSync(avatarMp4);

const out = join(dir, "episode.mp4");
if (!caps.ffmpeg()) { console.log(`[render] no ffmpeg — storyboard ready in build/${id}/`); process.exit(0); }

const enc = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30"];

function render(withSubs) {
  if (hasAvatar) {
    const fc = [
      "[0:v]split=2[a][b]",
      "[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=28,eq=brightness=-0.30[bg]",
      "[b]scale=1080:-2[fg]",
      `[bg][fg]overlay=(W-w)/2:130${withSubs ? `,ass=${assPath}` : ""}[v]`,
    ].join(";");
    execFileSync("ffmpeg", ["-y", "-i", avatarMp4, "-filter_complex", fc, "-map", "[v]", "-map", "0:a", ...enc, "-c:a", "aac", "-b:a", "128k", out], { stdio: "pipe" });
  } else {
    const base = ["-y", "-f", "lavfi", "-i", `color=c=0x0F172A:s=1080x1920:d=${duration.toFixed(2)}`];
    if (hasAudio) base.push("-i", wav);
    execFileSync("ffmpeg", [...base, "-vf", withSubs ? `ass=${assPath}` : "null", ...(hasAudio ? ["-map", "0:v", "-map", "1:a", "-shortest", "-c:a", "aac", "-b:a", "128k"] : []), ...enc, out], { stdio: "pipe" });
  }
}

try {
  render(true);
  console.log(`[render] ${id} → episode.mp4 (${duration.toFixed(1)}s, ${hasAvatar ? "avatar" : "base"} + captions ${hasAudio ? "+ voice" : ""})`);
} catch {
  console.warn("[render] subtitle burn-in failed — rendering without captions.");
  render(false);
  console.log(`[render] ${id} → episode.mp4 (captions at captions.ass)`);
}
