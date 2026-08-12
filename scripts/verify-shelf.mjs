// Month-shelf verification. Seeds IndexedDB directly, drives Edge via Playwright.
// Run: node scripts/verify-shelf.mjs  (after the dev server is up)
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

let pass = 0;
let fail = 0;
function assert(name, cond, detail) {
  if (cond) {
    pass++;
    console.log("PASS " + name);
  } else {
    fail++;
    console.log("FAIL " + name + (detail ? " — " + detail : ""));
  }
}

const now = new Date();
const cy = now.getFullYear();
const cm = now.getMonth();
const keyOf = (y, m) => `${y}-${m}`;
const monthName = (m) => ["january","february","march","april","may","june","july","august","september","october","november","december"][((m % 12) + 12) % 12];

function entry(id, y, m, day, catId) {
  const d = new Date(y, m, day, 10, 0, 0);
  return { id, text: "Entry " + id, createdAt: d.getTime(), updatedAt: d.getTime(), categoryId: catId ?? null };
}

const CATS = [
  { id: "c1", name: "Heavy days", color: "#8886C9" },
  { id: "c2", name: "Ideas", color: "#8FA98C" },
];

async function seed(page, entries) {
  await page.evaluate(([ents, cats]) => new Promise((res) => {
    const req = indexedDB.open("sonneto", 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("kv", "readwrite");
      const st = tx.objectStore("kv");
      st.clear();
      for (const e of ents) st.put(e, "entry:" + e.id);
      st.put(cats, "categories");
      tx.oncomplete = () => res("ok");
      tx.onerror = () => res("txerr");
    };
  }), [entries, CATS]);
}

/* navigate first (establishes the origin so IndexedDB is allowed), then seed, then reload */
async function setup(page, entries, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(APP);
  await page.waitForTimeout(400);
  await seed(page, entries);
  await page.goto(APP);
  await page.waitForTimeout(900);
}

const bookData = (page) =>
  page.evaluate(() => {
    const books = [...document.querySelectorAll('[data-role="book"]')].map((g) => {
      const r = g.getBoundingClientRect();
      const spine = g.querySelector("rect");
      return {
        month: g.getAttribute("data-month"),
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        cx: r.x + r.width / 2,
        spineW: spine ? parseFloat(spine.getAttribute("width")) : 0,
        spineH: spine ? parseFloat(spine.getAttribute("height")) : 0,
        fill: spine ? spine.getAttribute("fill") : null,
      };
    });
    const cat = document.querySelector("svg.cat").getBoundingClientRect();
    const band = document.querySelector(".write-band").getBoundingClientRect();
    const send = document.querySelector(".send").getBoundingClientRect();
    const sendCs = getComputedStyle(document.querySelector(".send"));
    const bandCs = getComputedStyle(document.querySelector(".write-band"));
    return {
      books,
      catCX: cat.x + cat.width / 2,
      catW: cat.width,
      band: { left: Math.round(band.left), width: Math.round(band.width) },
      send: { left: Math.round(send.left), right: Math.round(send.right), pos: sendCs.position, rightCss: sendCs.right },
      bandPos: bandCs.position,
      bookends: document.querySelectorAll('[data-role="bookend"]').length,
      bookendRects: [...document.querySelectorAll('[data-role="bookend"]')].map((g) => g.getBoundingClientRect()),
      shelfLine: !!document.querySelector('[data-role="shelf-line"]'),
    };
  });

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
p.on("console", (m) => { if (m.text().includes("LAYOUT") || m.text().includes("CUT")) console.log("BROWSER " + m.text()); });

/* T1 — zero entries */
await setup(p, [], { width: 1280, height: 800 });
{
  const d = await bookData(p);
  assert("T1 zero entries -> no books", d.books.length === 0);
  assert("T1 zero entries -> no shelf line", !d.shelfLine);
  await p.screenshot({ path: ".shots/shelf-empty-draft.png" });
}

/* T2 — one month -> one book, one bookend, shelf line */
await setup(p, [entry("a1", cy, cm, 1), entry("a2", cy, cm, 2), entry("a3", cy, cm, 3)], { width: 1280, height: 800 });
{
  const d = await bookData(p);
  assert("T2 one month -> one book", d.books.length === 1);
  assert("T2 one month -> one bookend", d.bookends === 1);
  assert("T2 one month -> shelf line present", d.shelfLine);
  const cz = d.catW * 0.34;
  const gap = Math.abs(d.books[0].cx - d.books[0].w / 2 - (d.catCX + cz));
  assert("A1 one-month gap to clear zone < 10px", gap < 10, "gap " + gap.toFixed(1));
  await p.screenshot({ path: ".shots/shelf-1mo-light.png" });
}

/* T3 — two months -> two books, one either side of the cat centre */
await setup(p, [entry("b1", cm - 1 < 0 ? cy - 1 : cy, ((cm - 1) % 12 + 12) % 12, 1), entry("b2", cm - 1 < 0 ? cy - 1 : cy, ((cm - 1) % 12 + 12) % 12, 2), entry("b3", cy, cm, 1)], { width: 1280, height: 800 });
{
  const d = await bookData(p);
  assert("T3 two months -> two books", d.books.length === 2);
  const left = d.books.filter((b) => b.cx < d.catCX);
  const right = d.books.filter((b) => b.cx > d.catCX);
  assert("T3 one book either side of the cat", left.length === 1 && right.length === 1);
  const cz2 = d.catW * 0.34;
  const leftInnerEdge = Math.max(...left.map((b) => b.x + b.w));
  const rightInnerEdge = Math.min(...right.map((b) => b.x));
  const gapL = Math.abs(leftInnerEdge - (d.catCX - cz2));
  const gapR = Math.abs(rightInnerEdge - (d.catCX + cz2));
  assert("A2 two-month inner edges within 10px of clear zone", gapL < 10 && gapR < 10, "L " + gapL.toFixed(1) + " R " + gapR.toFixed(1));
  await p.screenshot({ path: ".shots/shelf-2mo-light.png" });
}

/* T4 — 51 entries -> two books, diary height 0.60-0.72 of mother, same fill */
{
  const ents = [];
  for (let i = 0; i < 51; i++) ents.push(entry("d" + i, cy, cm, (i % 28) + 1));
  await setup(p, ents, { width: 1280, height: 800 });
  const d = await bookData(p);
  assert("T4 51 entries -> two books", d.books.length === 2, "got " + d.books.length);
  const sorted = [...d.books].sort((a, b) => b.spineH - a.spineH);
  const ratio = sorted.length === 2 ? sorted[1].spineH / sorted[0].spineH : 0;
  assert("T4 diary height 0.60-0.72 of mother", ratio >= 0.6 && ratio <= 0.72, "ratio " + ratio.toFixed(3));
  assert("T4 same fill", sorted.length === 2 && sorted[0].fill === sorted[1].fill);
  await p.screenshot({ path: ".shots/shelf-heavy-light.png" });
}

/* T5 — 50 vs 80 entries -> mother widths equal within 0.5 */
{
  let w50 = null;
  let w80 = null;
  for (const [label, n] of [["50", 50], ["80", 80]]) {
    const ents = [];
    for (let i = 0; i < n; i++) ents.push(entry("e" + label + i, cy, cm, (i % 28) + 1));
    await setup(p, ents, { width: 1280, height: 800 });
    const d = await bookData(p);
    const mother = d.books.filter((b) => b.month === keyOf(cy, cm)).sort((a, b) => b.spineH - a.spineH)[0];
    if (label === "50") w50 = mother ? mother.spineW : null;
    else w80 = mother ? mother.spineW : null;
  }
  assert("T5 mother widths equal (50 vs 80)", w50 != null && w80 != null && Math.abs(w50 - w80) <= 0.5, w50 + " vs " + w80);
}

/* T6 — zero-month between two non-zero months -> no book, wide gap */
await setup(p, [entry("f1", cm - 2 < 0 ? cy - 1 : cy, ((cm - 2) % 12 + 12) % 12, 1), entry("f2", cm - 2 < 0 ? cy - 1 : cy, ((cm - 2) % 12 + 12) % 12, 2), entry("f3", cy, cm, 1)], { width: 1280, height: 800 });
{
  const d = await bookData(p);
  const gapKey = keyOf(cm - 1 < 0 ? cy - 1 : cy, ((cm - 1) % 12 + 12) % 12);
  assert("T6 no book for the zero month", !d.books.some((b) => b.month === gapKey));
  const sorted = [...d.books].sort((a, b) => a.x - b.x);
  const gap = sorted.length === 2 ? sorted[1].x - (sorted[0].x + sorted[0].w) : 0;
  assert("T6 gap wider than a normal month gap", gap > 8, "gap " + gap.toFixed(1));
}

/* T7 — width non-decreasing across counts 1,5,20,50 */
{
  const widths = [];
  for (const n of [1, 5, 20, 50]) {
    const ents = [];
    for (let i = 0; i < n; i++) ents.push(entry("g" + n + i, cy, cm, (i % 28) + 1));
    await setup(p, ents, { width: 1280, height: 800 });
    const d = await bookData(p);
    const mother = d.books.filter((b) => b.month === keyOf(cy, cm)).sort((a, b) => b.spineH - a.spineH)[0];
    widths.push(mother ? mother.spineW : 0);
  }
  const ok = widths[0] <= widths[1] && widths[1] <= widths[2] && widths[2] <= widths[3];
  assert("T7 width non-decreasing (1,5,20,50)", ok, widths.map((w) => w.toFixed(1)).join(" < "));
}

/* T8 — no two consecutive months share a fill */
await setup(p, [entry("h1", cm - 2 < 0 ? cy - 1 : cy, ((cm - 2) % 12 + 12) % 12, 1), entry("h2", cm - 1 < 0 ? cy - 1 : cy, ((cm - 1) % 12 + 12) % 12, 1), entry("h3", cy, cm, 1)], { width: 1280, height: 800 });
{
  const d = await bookData(p);
  const sorted = [...d.books].sort((a, b) => a.month.localeCompare(b.month));
  let ok = sorted.length >= 2;
  for (let i = 1; i < sorted.length; i++) if (sorted[i].fill === sorted[i - 1].fill) ok = false;
  assert("T8 no consecutive months share a fill", ok, sorted.map((b) => b.fill).join(","));
}

/* T9 — every book resolves from a tap at centre and centre ± 20 */
await setup(p, [entry("i1", cm - 1 < 0 ? cy - 1 : cy, ((cm - 1) % 12 + 12) % 12, 1), entry("i2", cy, cm, 1)], { width: 1280, height: 800 });
{
  const d = await bookData(p);
  let allOk = true;
  let detail = "";
  for (const b of d.books) {
    for (const off of [0, -20, 20]) {
      const x = b.cx + off;
      const y = b.y + b.h / 2;
      await p.mouse.click(x, y);
      await p.waitForTimeout(120);
      const bubble = (await p.locator(".shelf-bubble").count()) > 0;
      if (!bubble) {
        allOk = false;
        detail += b.month + "@" + off + " no-bubble; ";
      }
    }
  }
  assert("T9 every book tappable at centre ±20", allOk, detail);
  await p.mouse.click(d.books[0].cx, d.books[0].y + d.books[0].h / 2);
  await p.waitForTimeout(300);
  await p.screenshot({ path: ".shots/shelf-bubble.png" });
}

/* T10 — one a11y button per month with matching label */
await setup(p, [entry("j1", cm - 1 < 0 ? cy - 1 : cy, ((cm - 1) % 12 + 12) % 12, 1), entry("j2", cy, cm, 1)], { width: 1280, height: 800 });
{
  const a11y = await p.evaluate(() => [...document.querySelectorAll(".shelf-a11y button")].map((b) => b.getAttribute("aria-label")));
  assert("T10 one a11y button per month", a11y.length === 2, "got " + a11y.length);
  const labels = ["1 entry in " + monthName(cm), "1 entry in " + monthName(cm - 1)];
  const matches = labels.every((l) => a11y.includes(l));
  assert("T10 a11y labels match", matches, JSON.stringify(a11y));
}

/* T11 — prefers-reduced-motion -> correct final widths, no animation */
{
  await setup(p, [entry("k1", cy, cm, 1), entry("k2", cy, cm, 2)], { width: 1280, height: 800 });
  await p.emulateMedia({ reducedMotion: "reduce" });
  // add a third entry through the app UI
  await p.getByRole("button", { name: "write", exact: true }).click();
  await p.waitForTimeout(300);
  await p.locator(".pad").fill("A third entry for the reduced-motion test.");
  await p.locator(".send.on").click();
  await p.waitForTimeout(600);
  const w1 = await bookData(p);
  const mother1 = w1.books.filter((b) => b.month === keyOf(cy, cm)).sort((a, b) => b.spineH - a.spineH)[0];
  await p.waitForTimeout(400);
  const w2 = await bookData(p);
  const mother2 = w2.books.filter((b) => b.month === keyOf(cy, cm)).sort((a, b) => b.spineH - a.spineH)[0];
  const stable = mother1 && mother2 && Math.abs(mother1.spineW - mother2.spineW) < 0.2;
  const expected = 13 + 20 * (1 - Math.exp(-3 / 18));
  const rightW = mother1 && Math.abs(mother1.spineW - expected) < 2.5;
  assert("T11 reduced motion -> final width stable", !!stable);
  assert("T11 reduced motion -> width is the final value", !!rightW, "got " + (mother1 ? mother1.spineW.toFixed(1) : "none") + " expected ~" + expected.toFixed(1));
  await p.emulateMedia({ reducedMotion: null });
}

/* T12 — amendment: 380px, six months at 120+ entries -> no book overlaps the send */
{
  const ents = [];
  let n = 0;
  for (let i = 5; i >= 0; i--) {
    const my = cm - i;
    const yy = my < 0 ? cy - 1 : cy;
    const mm = ((my % 12) + 12) % 12;
    for (let k = 0; k < 120; k++) ents.push(entry("l" + n++, yy, mm, (k % 28) + 1));
  }
  for (const vp of [{ width: 380, height: 760 }, { width: 1280, height: 800 }]) {
    await setup(p, ents, vp);
    if (vp.width === 380) await p.screenshot({ path: ".shots/shelf-mobile-380.png" });
    const ov = await p.evaluate(() => {
      const send = document.querySelector(".send").getBoundingClientRect();
      const rects = [
        ...[...document.querySelectorAll('[data-role="book"]')].map((g) => g.getBoundingClientRect()),
        ...[...document.querySelectorAll('[data-role="bookend"]')].map((g) => g.getBoundingClientRect()),
      ];
      const overlap = rects.filter((r) => !(r.right < send.left || r.left > send.right || r.bottom < send.top || r.top > send.bottom));
      return { count: rects.length, overlaps: overlap.length };
    });
    assert("T12 no book/bookend overlaps the send at " + vp.width, ov.overlaps === 0, "count=" + ov.count + " overlaps=" + ov.overlaps);
  }
}

/* extra screenshots: 6 months light + dark, typing-long */
{
  const ents = [];
  let n = 0;
  for (let i = 5; i >= 0; i--) {
    const my = cm - i;
    const yy = my < 0 ? cy - 1 : cy;
    const mm = ((my % 12) + 12) % 12;
    for (let k = 0; k < 3; k++) ents.push(entry("m" + n++, yy, mm, (k % 28) + 1));
  }
  await setup(p, ents, { width: 1280, height: 800 });
  await p.screenshot({ path: ".shots/shelf-6mo-light.png" });
  await p.locator(".nav .theme-btn").click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: ".shots/shelf-6mo-dark.png" });
  await p.locator(".nav .theme-btn").click();
  await p.waitForTimeout(300);
  await setup(p, [], { width: 1280, height: 800 });
  await p.locator(".pad").fill("A long journal line that keeps going and going. ".repeat(60));
  await p.waitForTimeout(300);
  await p.screenshot({ path: ".shots/shelf-typing-long.png" });
}

await browser.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
