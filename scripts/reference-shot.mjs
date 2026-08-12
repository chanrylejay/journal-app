// Render reference.html and capture it for review.
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
function findPlaywright() {
  try { return require("playwright"); } catch {}
  const cache = process.env.LOCALAPPDATA + "/npm-cache/_npx";
  const dir = fs.readdirSync(cache).map((e) => cache + "/" + e + "/node_modules/playwright").find((d) => fs.existsSync(d + "/package.json"));
  return require(dir);
}
const { chromium } = findPlaywright();
const browser = await chromium.launch({ channel: "msedge" });
const p = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("file:///c:/Users/Chanryle/Downloads/Projects/Github/journal-app/reference.html");
await p.waitForTimeout(1200);
const info = await p.evaluate(() => ({
  faces: document.querySelectorAll(".face").length,
  shelfSvg: !!document.querySelector("#shelf svg"),
  books: document.querySelectorAll('#shelf [opacity="0.8"]').length,
  shelfWidth: document.querySelector("#shelf svg") ? Math.round(document.querySelector("#shelf svg").getAttribute("width")) : 0,
}));
if (!fs.existsSync(".shots")) fs.mkdirSync(".shots");
await p.screenshot({ path: ".shots/reference-sheet.png" });
console.log(JSON.stringify({ info, errors: errs }));
await browser.close();
