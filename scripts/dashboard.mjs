#!/usr/bin/env node
/**
 * dashboard — a local review page for every rendered episode.
 * Writes build/index.html (open it in a browser; no server needed).
 */
import { readdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const build = join(ROOT, "build");

const ids = existsSync(build)
  ? readdirSync(build).filter((d) => existsSync(join(build, d, "storyboard.json")))
  : [];

const cards = ids
  .map((id) => {
    const sb = JSON.parse(readFileSync(join(build, id, "storyboard.json"), "utf-8"));
    const mp4 = existsSync(join(build, id, "episode.mp4"));
    const video = mp4
      ? `<video src="${id}/episode.mp4" controls preload="metadata" class="w-full rounded-lg"></video>`
      : `<div class="rounded-lg border border-dashed border-stone-300 h-64 flex items-center justify-center text-stone-400">not rendered</div>`;
    return `<div class="bg-white border border-stone-200 rounded-2xl p-4">
      <div class="flex items-baseline justify-between mb-2">
        <h2 class="font-serif text-lg">${sb.title}</h2>
        <span class="text-xs text-stone-400">${sb.date} · ${sb.id}</span>
      </div>
      ${video}
      <p class="text-sm text-stone-600 mt-3">${sb.hook || ""}</p>
      <details class="mt-2 text-sm text-stone-500">
        <summary class="cursor-pointer">script &amp; captions</summary>
        <p class="mt-2 whitespace-pre-line">${sb.script}</p>
      </details>
    </div>`;
  })
  .join("\n");

const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Studio — ${ids.length} episode(s)</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>body{background:#fafaf9}</style></head>
<body class="max-w-5xl mx-auto px-5 py-10">
  <h1 class="font-serif text-3xl">Studio</h1>
  <p class="text-stone-500 mb-8">${ids.length} episode(s) · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")}</p>
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">${cards || '<p class="text-stone-400">No episodes yet — run <code>npm run episode</code>.</p>'}</div>
</body></html>`;

writeFileSync(join(build, "index.html"), html);
console.log(`[dashboard] build/index.html (${ids.length} episodes)`);
