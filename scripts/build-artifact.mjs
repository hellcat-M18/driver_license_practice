// index.html と CSS・JS を1つのHTML断片にまとめる（claude.ai の Artifact 公開用）。
// `node scripts/build-artifact.mjs` で dist/artifact.html を作る。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

let html = read("index.html");
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, p) => `<style>\n${read(p)}</style>`);
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, p) => `<script>\n${read(p).replace(/<\/script/gi, "<\\/script")}</script>`);
// Artifact 側が doctype・html・head・body を付けるので取り除く
html = html
  .replace(/<!doctype html>\s*/i, "")
  .replace(/<html[^>]*>\s*/i, "")
  .replace(/<\/html>\s*/i, "")
  .replace(/<head>\s*/i, "")
  .replace(/<\/head>\s*/i, "")
  .replace(/<body>\s*/i, "")
  .replace(/<\/body>\s*/i, "")
  .replace(/<meta charset="utf-8">\s*/i, "")
  .replace(/<meta name="viewport"[^>]*>\s*/i, "");

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "artifact.html"), html);
console.log(`dist/artifact.html (${Math.round(html.length / 1024)} KB)`);
