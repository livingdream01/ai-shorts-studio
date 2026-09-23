import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const has = (cmd) => {
  try { execFileSync("command", ["-v", cmd], { shell: "/bin/sh", stdio: "pipe" }); return true; }
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
 * Text-to-speech. Uses the macOS `say` command locally; returns the audio path
 * or null if no TTS is available (the render then produces a silent video).
 */
export function tts({ text, outWav, voice = "Samantha" }) {
  if (!has("say")) return null; // e.g. on Linux CI
  const aiff = outWav.replace(/\.wav$/, ".aiff");
  execFileSync("say", ["-v", voice, "-o", aiff, text], { stdio: "inherit" });
  if (!has("ffmpeg")) return null;
  execFileSync("ffmpeg", ["-y", "-i", aiff, "-ar", "44100", "-ac", "1", outWav], { stdio: "pipe" });
  return existsSync(outWav) ? outWav : null;
}

export const caps = { has, say: () => has("say"), ffmpeg: () => has("ffmpeg") };
