#!/usr/bin/env node
/**
 * generate — turn a content/<id>.yml episode spec into build/<id>/storyboard.json.
 *
 * With LLM_API_KEY set it can rewrite/polish the script; without one it uses the
 * spec as-is and derives captions from the script. Zero cost either way.
 *
 *   node scripts/generate.mjs            # first content/*.yml
 *   node scripts/generate.mjs 001        # match by substring
 */
import YAML from "yaml";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, config } from "./lib/config.mjs";
import { llm } from "./lib/providers.mjs";

const cfg = config();
const contentDir = join(ROOT, "content");
const arg = process.argv[2];
const ymlFiles = readdirSync(contentDir).filter((f) => f.endsWith(".yml")).sort();

// Default selection: the next episode that has not been rendered yet, so the
// daily box works through a season in order without being told which one.
function pick() {
  if (arg) return ymlFiles.find((f) => f.includes(arg));
  for (const f of ymlFiles) {
    const id = YAML.parse(readFileSync(join(contentDir, f), "utf-8")).id;
    if (!existsSync(join(ROOT, "build", id, "episode.mp4"))) return f;
  }
  return ymlFiles[0];
}
const file = pick();

if (!file) {
  console.error(arg ? `no content/*.yml matching "${arg}"` : "no content/*.yml found");
  process.exit(1);
}

const ep = YAML.parse(readFileSync(join(contentDir, file), "utf-8"));
let script = String(ep.script || "").trim();

if (cfg.llmKey) {
  const polished = await llm({
    key: cfg.llmKey,
    model: cfg.llmModel,
    system:
      "You write tight 25-second vertical video scripts. Return ONLY the spoken script, 60-80 words, first person, no scene directions.",
    user: `Theme: ${ep.hook}\nSeries: ${ep.series || ""}\nDraft:\n${script}`,
  });
  if (polished) script = polished;
}

let captions = Array.isArray(ep.captions) ? ep.captions : [];
if (!captions.length) {
  captions = script
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

const storyboard = {
  id: ep.id,
  date: ep.date,
  title: ep.title,
  series: ep.series || "",
  character: ep.character || "",
  voice: ep.voice || cfg.ttsVoice,
  hook: ep.hook || captions[0] || "",
  signoff: ep.signoff || "",
  script,
  captions,
  shots: ep.shots || [],
  generatedBy: cfg.llmKey ? "llm" : "template",
};

const outDir = join(ROOT, "build", ep.id);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "storyboard.json"), JSON.stringify(storyboard, null, 2));
console.log(`[generate] ${ep.id} → build/${ep.id}/storyboard.json · ${captions.length} captions · ${storyboard.generatedBy}`);
