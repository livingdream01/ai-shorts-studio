#!/usr/bin/env node
/**
 * schedule — the studio's heartbeat. Runs inside the container.
 *
 *   RUN_ONCE=1        run one episode now and exit (handy for CI/demo)
 *   RUN_HOUR=14       otherwise run at 14:00 local, then every day
 *
 * Pipeline per run: generate → render → dashboard → publish (respects PUBLISH).
 */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Episodes in content/ that have no rendered video yet (filename stem == id). */
function unrendered() {
  const c = join(ROOT, "content");
  return readdirSync(c)
    .filter((f) => f.endsWith(".yml"))
    .filter((f) => !existsSync(join(ROOT, "build", f.replace(/\.yml$/, ""), "episode.mp4")));
}
const run = (script) => {
  try {
    execFileSync(process.execPath, [join(ROOT, "scripts", script)], { stdio: "inherit" });
    return true;
  } catch (e) {
    console.error(`[schedule] ${script} failed: ${e.message}`);
    return false;
  }
};

function runEpisode() {
  const stamp = new Date().toISOString();
  const queue = unrendered();
  if (!queue.length) {
    console.log(`\n[schedule] ${stamp} — all episodes rendered, nothing queued. Idle.`);
    return;
  }
  console.log(`\n[schedule] ▶ episode run at ${stamp} (${queue.length} queued)`);
  if (run("generate.mjs")) run("render.mjs");
  try { run("dashboard.mjs"); } catch {}
  run("publish.mjs");
}

if (process.env.RUN_ONCE === "1") {
  runEpisode();
  process.exit(0);
}

const hour = Number(process.env.RUN_HOUR || 14);
function msUntilHour(h) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

runEpisode(); // once on boot
const scheduleNext = () => {
  const ms = msUntilHour(hour);
  console.log(`[schedule] next run in ${(ms / 3.6e6).toFixed(1)}h (at ${hour}:00)`);
  setTimeout(() => { runEpisode(); scheduleNext(); }, ms);
};
scheduleNext();
