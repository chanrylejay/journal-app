// The shelf must not change the band height (scroll-padding 220 stays valid),
// and typing at the end of a long entry keeps the caret above the band.
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
    for (let i = 0; i < 4; i++) st.put({ id: "c" + i, text: "Shelf entry " + i, createdAt: now - i * 86400000, updatedAt: now - i * 86400000, categoryId: null }, "entry:c" + i);
    st.put([{ id: "c1", name: "Heavy days", color: "#8886C9" }], "categories");
    tx.oncomplete = () => res("ok");
    tx.onerror = () => res("txerr");
  };
}));
await p.goto(APP);
await p.waitForTimeout(900);

const long = "A long journal line that keeps going. ".repeat(70);
await p.locator(".pad").fill(long);
await p.evaluate(() => { const t = document.querySelector(".pad"); t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
await p.waitForTimeout(300);
for (let i = 0; i < 8; i++) { await p.keyboard.type("x"); await p.waitForTimeout(30); }
await p.waitForTimeout(300);

const out = await p.evaluate(() => {
  const band = document.querySelector(".write-band").getBoundingClientRect();
  const pad = document.querySelector(".pad").getBoundingClientRect();
  const books = document.querySelectorAll('[data-role="book"]').length;
  return {
    bandHeight: Math.round(band.height),
    caretLineAboveBand: pad.bottom <= band.top,
    padBottom: Math.round(pad.bottom),
    bandTop: Math.round(band.top),
    books,
    writeScrollClass: document.documentElement.classList.contains("write-scroll"),
  };
});
console.log(JSON.stringify(out));
await browser.close();
