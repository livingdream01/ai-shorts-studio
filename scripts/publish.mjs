#!/usr/bin/env node
/**
 * publish — send the rendered episode to Instagram.
 *
 * Defaults to a DRY RUN. Set PUBLISH=true and provide credentials to publish for
 * real. Two adapters:
 *   - Postiz (recommended): POSTIZ_URL + POSTIZ_API_KEY
 *   - Instagram Graph API: IG_ACCESS_TOKEN + IG_USER_ID (+ a public video URL)
 *
 *   node scripts/publish.mjs            # newest build
 *   node scripts/publish.mjs 001
 *   PUBLISH=true node scripts/publish.mjs 001
 */
import { readFileSync, appendFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT, config } from "./lib/config.mjs";

const cfg = config();
const buildRoot = join(ROOT, "build");
const arg = process.argv[2];

const dirs = readdirSync(buildRoot).filter((d) => existsSync(join(buildRoot, d, "storyboard.json")));
if (!dirs.length) { console.error("no build/*/storyboard.json — run: npm run generate && npm run render"); process.exit(1); }
const id = arg ? (dirs.find((d) => d.includes(arg)) || dirs[0]) : dirs.sort((a, b) => statSync(join(buildRoot, b)).mtimeMs - statSync(join(buildRoot, a)).mtimeMs)[0];
const dir = join(buildRoot, id);
const sb = JSON.parse(readFileSync(join(dir, "storyboard.json"), "utf-8"));
const video = join(dir, "episode.mp4");

const caption = [
  sb.hook,
  "",
  sb.signoff,
  "",
  "Voices and visuals are AI-generated. The thoughts are real.",
  "",
  "#reels #shorts #mindset #discipline #growth",
].join("\n");

const log = (row) => appendFileSync(join(ROOT, "content", "log.csv"), `${[sb.date, sb.id, "instagram", ...row].join(",")}\n`);

function hasPublicUrl() {
  return Boolean(process.env.MEDIA_URL_BASE && existsSync(video));
}

async function publishPostiz() {
  const res = await fetch(`${cfg.postizUrl.replace(/\/$/, "")}/public/v1/posts`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: cfg.postizKey },
    body: JSON.stringify({
      type: "now",
      posts: [{ content: caption, provider: "instagram", media: [{ path: video }] }],
    }),
  });
  if (!res.ok) throw new Error(`Postiz ${res.status}: ${await res.text()}`);
  return res.json();
}

async function publishGraph() {
  if (!hasPublicUrl()) {
    throw new Error("Instagram Graph API needs a PUBLIC video URL. Set MEDIA_URL_BASE to a host that serves build/<id>/episode.mp4.");
  }
  const url = `${process.env.MEDIA_URL_BASE.replace(/\/$/, "")}/${id}/episode.mp4`;
  const create = await fetch(`https://graph.facebook.com/v21.0/${cfg.igUserId}/media`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ media_type: "REELS", video_url: url, caption, access_token: cfg.igToken }),
  });
  const created = await create.json();
  if (!created.id) throw new Error(`Graph create failed: ${JSON.stringify(created)}`);
  const pub = await fetch(`https://graph.facebook.com/v21.0/${cfg.igUserId}/media_publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ creation_id: created.id, access_token: cfg.igToken }),
  });
  return pub.json();
}

console.log(`[publish] ${id} · caption ${caption.length} chars · video ${existsSync(video) ? "ready" : "MISSING"}`);

if (!cfg.publish) {
  console.log("[publish] DRY RUN — set PUBLISH=true with credentials to publish for real.");
  console.log("--- caption ---\n" + caption + "\n---------------");
  log(["dry-run", "", "", "", "", ""]);
  process.exit(0);
}

try {
  let result;
  if (cfg.postizUrl && cfg.postizKey) result = await publishPostiz();
  else if (cfg.igToken && cfg.igUserId) result = await publishGraph();
  else { console.log("[publish] no credentials configured (Postiz or IG). Nothing sent."); log(["no-credentials", "", "", "", "", ""]); process.exit(0); }
  console.log("[publish] published:", JSON.stringify(result).slice(0, 200));
  log(["published", "", "", "", "", JSON.stringify(result).slice(0, 80)]);
} catch (e) {
  console.error("[publish] failed:", e.message);
  log(["error", "", "", "", "", e.message.slice(0, 80)]);
  process.exit(1);
}
