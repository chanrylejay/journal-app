// Does the write band cap at 620 or grow with a wide viewport?
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
const b = await chromium.launch({ channel: "msedge" });
const out = {};
for (const w of [1280, 1600, 1920, 2560]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } });
  await p.goto("http://localhost:5173/");
  await p.waitForTimeout(600);
  out[w] = await p.evaluate(() => {
    const band = document.querySelector(".write-band").getBoundingClientRect();
    return { bandW: Math.round(band.width), vw: window.innerWidth };
  });
  await p.close();
}
console.log(JSON.stringify(out));
await b.close();
