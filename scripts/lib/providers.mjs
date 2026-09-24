import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./config.mjs";

const has = (cmd) => {
  try { execFileSync("command", ["-v", cmd], { shell: "/bin/sh", stdio: "pipe" }); return true; }
  catch { return false; }
};
const hasPy = (mod) => {
  try { execFileSync("python3", ["-c", `import ${mod}`], { stdio: "pipe" }); return true; }
  catch { return false; }
};

/** OpenAI-compatible chat call. Returns text, or null when no key is configured. */
export async function llm({ key, model, system, user }) {
  if (!key) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.8,
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/**
 * Text-to-speech, no API key. Best available, in order:
 *   1. Kokoro — natural neural TTS (if installed)
 *   2. Piper  — local neural TTS
 *   3. macOS `say`
 */
export function tts({ text, outWav, voice = "Samantha" }) {
  // 1) Kokoro (natural)
  if (hasPy("kokoro")) {
    const script = join(ROOT, "scripts", "lib", "tts_kokoro.py");
    const kvoice = process.env.KOKORO_VOICE || "af_heart";
    try {
      execFileSync("python3", [script, outWav, kvoice, "0.92"], { input: text, stdio: ["pipe", "pipe", "pipe"] });
      if (existsSync(outWav)) return outWav;
    } catch (e) {
      console.warn(`[tts] kokoro failed, falling back: ${String(e.message).split("\n")[0]}`);
    }
  }
  // 2) Piper
  if (has("piper")) {
    const model = process.env.PIPER_MODEL || "/voices/en_US-lessac-medium.onnx";
    try {
      execFileSync("piper", ["--model", model, "--output_file", outWav], { input: text });
      if (existsSync(outWav)) return outWav;
    } catch {}
  }
  // 3) macOS say
  if (has("say")) {
    const aiff = outWav.replace(/\.wav$/, ".aiff");
    execFileSync("say", ["-v", voice, "-o", aiff, text], { stdio: "inherit" });
    if (has("ffmpeg")) execFileSync("ffmpeg", ["-y", "-i", aiff, "-ar", "44100", "-ac", "1", outWav], { stdio: "pipe" });
    return existsSync(outWav) ? outWav : null;
  }
  return null;
}

export const caps = {
  has,
  ffmpeg: () => has("ffmpeg"),
  kokoro: () => hasPy("kokoro"),
  piper: () => has("piper"),
  whisper: () => hasPy("faster_whisper"),
  wav2lip: () => existsSync("/opt/wav2lip/inference.py"),
};
