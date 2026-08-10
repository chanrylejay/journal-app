// Captures screenshots for Chan's eyes. Run: node scripts/shots.mjs
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
    for (let i = 1; i <= 5; i++) st.put({ id: "s" + i, text: "A short entry about the day and the small things that mattered. ".repeat(3), createdAt: now - i * 3600000, updatedAt: now - i * 3600000, categoryId: null }, "entry:s" + i);
    st.put([{ id: "c1", name: "Heavy days", color: "#8886C9" }, { id: "c2", name: "Ideas", color: "#8FA98C" }], "categories");
    tx.oncomplete = () => res("ok");
    tx.onerror = () => res("txerr");
  };
}));
await p.goto(APP);
await p.waitForTimeout(900);

// write light (short entry: band below text)
await p.screenshot({ path: ".shots/v14-write-light.png" });
// write light long entry (band sticky, cat + send visible)
const long = "A long journal line that keeps going and going. ".repeat(55);
await p.locator(".pad").fill(long);
await p.waitForTimeout(400);
await p.screenshot({ path: ".shots/v14-write-long.png" });
// dark long
await p.locator(".nav .theme-btn").click();
await p.waitForTimeout(500);
await p.screenshot({ path: ".shots/v14-write-long-dark.png" });
// shelf (header utils)
await p.getByRole("button", { name: "shelf", exact: true }).click();
await p.waitForTimeout(500);
await p.screenshot({ path: ".shots/v14-shelf-light.png", fullPage: true });
// reader (with margin line)
await p.locator("article").first().click();
await p.waitForTimeout(400);
await p.screenshot({ path: ".shots/v14-reader.png" });

await browser.close();
console.log("shots written to .shots/v14-*.png");
