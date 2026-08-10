// Captures v1.5 screenshots for Chan's eyes. Run: node scripts/shots.mjs
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
if (!fs.existsSync(".shots")) fs.mkdirSync(".shots");

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(APP);
await p.evaluate(() => new Promise((res) => {
  const req = indexedDB.open("sonneto", 1);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("kv", "readwrite");
    const st = tx.objectStore("kv");
    const now = Date.now();
    for (let i = 1; i <= 12; i++) st.put({ id: "s" + i, text: "A short entry about the day and the small things that mattered. ".repeat(3), createdAt: now - i * 3600000, updatedAt: now - i * 3600000, categoryId: null }, "entry:s" + i);
    st.put([{ id: "c1", name: "Heavy days", color: "#8886C9" }, { id: "c2", name: "Ideas", color: "#8FA98C" }], "categories");
    tx.oncomplete = () => res("ok");
    tx.onerror = () => res("txerr");
  };
}));
await p.goto(APP);
await p.waitForTimeout(900);

// long draft, scroll to bottom: band solid, no text bleed
const long = "A long journal line that keeps going and going. ".repeat(70);
await p.locator(".pad").fill(long);
await p.waitForTimeout(400);
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(300);
await p.screenshot({ path: ".shots/v15-write-long.png" });
// dark long
await p.locator(".nav .theme-btn").click();
await p.waitForTimeout(500);
await p.screenshot({ path: ".shots/v15-write-long-dark.png" });
await p.locator(".nav .theme-btn").click();
await p.waitForTimeout(400);

// shelf light (header utils, new contrast ramp)
await p.getByRole("button", { name: "shelf", exact: true }).click();
await p.waitForTimeout(500);
await p.screenshot({ path: ".shots/v15-shelf-light.png", fullPage: true });
// category filter: utils hidden
await p.getByRole("button", { name: /Ideas/ }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: ".shots/v15-shelf-filter.png" });

await browser.close();
console.log("shots written to .shots/v15-*.png");
