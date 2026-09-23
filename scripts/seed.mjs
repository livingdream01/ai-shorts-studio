#!/usr/bin/env node
/**
 * seed — turn a season JSON into content/<id>.yml episode specs.
 * Skips ids that already exist. Safe to re-run.
 *
 *   node scripts/seed.mjs content/season-1.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { ROOT } from "./lib/config.mjs";
import YAML from "yaml";

const file = process.argv[2] || join(ROOT, "content", "season-1.json");
const eps = JSON.parse(readFileSync(file, "utf-8"));
const contentDir = join(ROOT, "content");

let made = 0, skipped = 0;
for (const e of eps) {
  const target = join(contentDir, `${e.id}.yml`);
  if (existsSync(target)) { skipped++; continue; }
  const doc = {
    id: e.id,
    title: e.title,
    series: e.series || "S1 — Wren Says",
    character: "Wren",
    voice: "en_US-lessac",
    hook: e.hook,
    signoff: e.signoff || "That's the whole thought. Another one tomorrow.",
    script: e.script,
    shots: e.shots || [],
  };
  writeFileSync(target, YAML.stringify(doc));
  made++;
}
console.log(`[seed] ${made} created, ${skipped} skipped (of ${eps.length}) from ${basename(file)}`);
