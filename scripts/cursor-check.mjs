// Hovering a book must show a pointer cursor.
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
const now = new Date();
const cy = now.getFullYear();
const cm = now.getMonth();
const entry = (id, y, m, day) => ({ id, text: "E" + id, createdAt: new Date(y, m, day, 10).getTime(), updatedAt: new Date(y, m, day, 10).getTime(), categoryId: null });

const browser = await chromium.launch({ channel: "msedge" });
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(APP);
await p.evaluate(([ents]) => new Promise((res) => {
  const req = indexedDB.open("sonneto", 1);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("kv", "readwrite");
    const st = tx.objectStore("kv");
    st.clear();
    for (const e of ents) st.put(e, "entry:" + e.id);
    st.put([{ id: "c1", name: "Heavy days", color: "#8886C9" }], "categories");
    tx.oncomplete = () => res("ok");
  };
}), [[entry("b1", cy, cm - 1, 1), entry("b2", cy, cm - 1, 2), entry("b3", cy, cm, 1)]]);
await p.goto(APP);
await p.waitForTimeout(1000);
const pt = await p.evaluate(() => {
  const b = document.querySelector('[data-role="book"]').getBoundingClientRect();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
});
await p.mouse.move(pt.x, pt.y);
await p.waitForTimeout(200);
const cursorAt = await p.evaluate(({ x, y }) => {
  const el = document.elementFromPoint(x, y);
  return el ? getComputedStyle(el).cursor : "no-element";
}, pt);
console.log(JSON.stringify({ cursorAtBook: cursorAt }));
await browser.close();
