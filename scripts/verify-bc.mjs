// B1 (utils gating) + C (contrast ramp) verification.
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
const out = {};
const browser = await chromium.launch({ channel: "msedge" });
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(APP);
await p.evaluate(() => new Promise((res) => {
  const req = indexedDB.open("sonneto", 1);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("kv", "readwrite");
    const st = tx.objectStore("kv");
    const now = Date.now();
    for (let i = 1; i <= 12; i++) st.put({ id: "v" + i, text: "Entry " + i + " with words to fill a card body for the shelf.", createdAt: now - i * 3600000, updatedAt: now - i * 3600000, categoryId: null }, "entry:v" + i);
    st.put([{ id: "c1", name: "Heavy days", color: "#8886C9" }, { id: "c2", name: "Ideas", color: "#8FA98C" }], "categories");
    tx.oncomplete = () => res("ok");
    tx.onerror = () => res("txerr");
  };
}));
await p.goto(APP);
await p.waitForTimeout(700);
await p.getByRole("button", { name: "shelf", exact: true }).click();
await p.waitForTimeout(500);
const utilsVisible = () => p.locator(".shelf-utils").count();

// B1: visible on Scratchpad
out.scratchpad = await utilsVisible();
// B1: hidden on a category filter
await p.getByRole("button", { name: /Ideas/ }).click();
await p.waitForTimeout(400);
out.categoryFilter = await utilsVisible();
// B1: hidden on search (search needs >10 entries, which we have)
await p.getByRole("button", { name: /Scratchpad/ }).click();
await p.waitForTimeout(300);
await p.locator(".search").fill("something");
await p.waitForTimeout(300);
out.searchFilter = await utilsVisible();
// B1: back to scratchpad, visible again
await p.locator(".search").fill("");
await p.waitForTimeout(300);
out.backToScratchpad = await utilsVisible();

// C: contrast values
out.c = await p.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const read = (v) => cs.getPropertyValue(v).trim();
  const nav = getComputedStyle(document.querySelector(".nav button"));
  let faintReadGone = true;
  try {
    for (const s of document.styleSheets) {
      for (const r of s.cssRules) if (r.cssText && r.cssText.includes("--faint-read")) { faintReadGone = false; }
    }
  } catch {}
  return { soft: read("--soft"), faint: read("--faint"), navColor: nav.color, faintReadGone };
});

// card text vs card bg contrast (light --soft on --raised)
await p.evaluate(() => { document.documentElement.classList.remove("theme-dark"); document.documentElement.classList.add("theme-light"); });
await p.waitForTimeout(300);
out.cardPairing = await p.evaluate(() => {
  const card = document.querySelector(".card-text");
  const text = getComputedStyle(card).color;
  const bg = getComputedStyle(document.querySelector(".card")).backgroundColor;
  const lum = (rgb) => { const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]); };
  const l1 = lum(text), l2 = lum(bg);
  return { text, bg, ratio: ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2) };
});

await browser.close();
console.log(JSON.stringify(out, null, 1));
