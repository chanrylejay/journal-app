// Regenerates public/icon-192.png and icon-512.png from the CURRENT Cat SVG
// (idle state) by rendering it in the live app and rasterizing standalone.
// Run: node scripts/make-icons-live.mjs
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
const APP = "http://localhost:5173/";

const CAT_VARS = `
  --fur: #FEFDFC;
  --gray: #BDB6CA;
  --gray-d: #9A92AC;
  --blush: #D6C5CE;
  --out: #9C95AC;
  --face: #524C63;
  --aura: #8E86AD;
  --aura-op: 0.13;
  --cat-shadow: #7A6E96;
  --cat-shadow-op: 0.19;
  --accent: #6562AC;
`;

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto(APP);
await page.waitForTimeout(900);
const svg = await page.evaluate(() => {
  const el = document.querySelector("svg.cat");
  return el ? el.outerHTML : null;
});
if (!svg) throw new Error("no svg.cat found in the app");

async function render(size, outPath, svgSize) {
  const p2 = await browser.newPage({ viewport: { width: size, height: size } });
  await p2.setContent(`<!doctype html><html><head><style>
    :root { ${CAT_VARS} }
    html, body { margin: 0; width: ${size}px; height: ${size}px; background: #F2F0F7; }
    body { display: flex; align-items: center; justify-content: center; }
    .cat { width: ${svgSize}px; height: ${svgSize}px; overflow: visible; display: block; }
  </style></head><body>${svg}</body></html>`);
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: outPath });
  await p2.close();
}

await render(512, "public/icon-512.png", 420);
await render(192, "public/icon-192.png", 158);
await browser.close();
console.log("icons regenerated from the current cat: public/icon-192.png, public/icon-512.png");
