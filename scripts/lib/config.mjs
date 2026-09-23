import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** Minimal .env loader (no dependency). Existing process.env wins. */
export function loadEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export function config() {
  loadEnv();
  const env = process.env;
  return {
    llmKey: env.LLM_API_KEY || "",
    llmModel: env.LLM_MODEL || "gpt-4o-mini",
    ttsProvider: env.TTS_PROVIDER || "say",
    ttsVoice: env.TTS_VOICE || "Samantha",
    postizUrl: env.POSTIZ_URL || "",
    postizKey: env.POSTIZ_API_KEY || "",
    igToken: env.IG_ACCESS_TOKEN || "",
    igUserId: env.IG_USER_ID || "",
    publish: env.PUBLISH === "true" || env.PUBLISH === "1",
  };
}
