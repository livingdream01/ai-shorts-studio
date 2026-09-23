#!/usr/bin/env node
/**
 * batch — render every unrendered episode, in order. Good for the first big push.
 *
 *   node scripts/batch.mjs        # all unrendered
 *   node scripts/batch.mjs 5      # at most 5
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const limit = Number(process.argv[2] || 0);
const contentDir = join(ROOT, "content");

const eps = readdirSync(contentDir)
  .filter((f) => f.endsWith(".yml"))
  .sort()
  .map((f) => ({ f, id: YAML.parse(readFileSync(join(contentDir, f), "utf-8")).id }))
  .filter(({ id }) => !existsSync(join(ROOT, "build", id, "episode.mp4")));

const todo = limit ? eps.slice(0, limit) : eps;
if (!todo.length) { console.log("[batch] nothing to render — all caught up."); process.exit(0); }
console.log(`[batch] rendering ${todo.length} episode(s)…`);

let ok = 0;
for (const { f, id } of todo) {
  const t = Date.now();
  try {
    execFileSync(process.execPath, [join(ROOT, "scripts", "generate.mjs"), id], { stdio: "pipe" });
    execFileSync(process.execPath, [join(ROOT, "scripts", "render.mjs"), id], { stdio: "pipe" });
    ok++;
    console.log(`  ✓ ${id} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  } catch (e) {
    console.error(`  ✗ ${id}: ${e.message.split("\n")[0]}`);
  }
}
try { execFileSync(process.execPath, [join(ROOT, "scripts", "dashboard.mjs")], { stdio: "inherit" }); } catch {}
console.log(`[batch] done — ${ok}/${todo.length} rendered.`);
