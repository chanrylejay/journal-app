// Touch verification after the A2 interaction rewrite.
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
const errs = [];

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE: " + m.text()); });
const snap = () => p.evaluate(() => ({
  articles: document.querySelectorAll("article").length,
  body: document.body.innerText.slice(0, 80).replace(/\n/g, " | "),
  reader: !!document.querySelector(".reader"),
}));
const rect = () => p.evaluate(() => {
  const a = document.querySelector("article");
  if (!a) return null;
  const g = a.getBoundingClientRect();
  return { x: g.x + g.width / 2, y: Math.max(g.y, 60) + 30 };
});

await p.goto(APP);
await p.evaluate(() => new Promise((res) => {
  const req = indexedDB.open("sonneto", 1);
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("kv", "readwrite");
    const st = tx.objectStore("kv");
    const now = Date.now();
    for (let i = 1; i <= 8; i++) st.put({ id: "t" + i, text: "Touch entry " + i + " body text.", createdAt: now - i * 3600000, updatedAt: now - i * 3600000, categoryId: null }, "entry:t" + i);
    st.put([{ id: "c1", name: "Heavy days", color: "#8886C9" }, { id: "c2", name: "Ideas", color: "#8FA98C" }], "categories");
    tx.oncomplete = () => res("ok");
    tx.onerror = () => res("txerr");
  };
}));
await p.goto(APP);
await p.waitForTimeout(700);
await p.getByRole("button", { name: "shelf", exact: true }).click();
await p.waitForTimeout(800);
const cdp = await ctx.newCDPSession(p);
out.initial = await snap();

// hold -> lift -> release stays picked -> tap Ideas chip files
{
  const ideas = p.getByRole("button", { name: /Ideas/ });
  const before = (await ideas.textContent()).trim();
  const r = await rect();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x, y: r.y }] });
  await p.waitForTimeout(330);
  const picked = await p.locator(".card-lifted").count();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await p.waitForTimeout(200);
  const stayedPicked = await p.locator(".card-lifted").count();
  const ib = await ideas.boundingBox();
  await p.touchscreen.tap(ib.x + ib.width / 2, ib.y + ib.height / 2);
  await p.waitForTimeout(450);
  out.holdTapFile = { picked, stayedPicked, before, after: (await ideas.textContent()).trim(), afterSnap: await snap() };
}

// short tap opens reader
{
  const r = await rect();
  out.tapState = { rect: r, snap: await snap() };
  if (r) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x, y: r.y }] });
    await p.waitForTimeout(50);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(400);
    out.tapOpensReader = (await p.locator(".reader").count()) > 0;
  }
  await p.evaluate(() => { const b = document.querySelector(".back"); if (b) b.click(); });
  await p.waitForTimeout(500);
}

// scroll works
{
  const r = await rect();
  out.scrollState = { rect: r, snap: await snap() };
  if (r) {
    const s0 = await p.evaluate(() => window.scrollY);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x, y: r.y }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: r.x, y: r.y - i * 22 }] });
      await p.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(350);
    out.scroll = { before: s0, after: await p.evaluate(() => window.scrollY), alive: (await p.locator("article").count()) > 0 };
  }
}

out.errors = errs;
await browser.close();
console.log(JSON.stringify(out, null, 1));
