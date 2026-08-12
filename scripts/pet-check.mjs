// The cat must still jump when petted, despite the shelf pointer-events work.
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
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto("http://localhost:5173/");
await p.waitForTimeout(800);
const cat = await p.evaluate(() => { const c = document.querySelector("svg.cat").getBoundingClientRect(); return { x: c.x + c.width / 2, y: c.y + c.height / 2 }; });
await p.mouse.click(cat.x, cat.y);
await p.waitForTimeout(120);
const jumped = await p.evaluate(() => !!document.querySelector(".cat-jump"));
await p.waitForTimeout(800);
const gone = await p.evaluate(() => !document.querySelector(".cat-jump"));
console.log(JSON.stringify({ jumpedOnPet: jumped, jumpCleared: gone }));
await browser.close();
