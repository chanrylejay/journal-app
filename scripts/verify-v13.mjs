// v1.3 verification: A1 frame, A2 smoothness, A3 rename, A4 font, B2 contrast.
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

async function seed(page) {
  await page.evaluate(() => new Promise((res) => {
    const req = indexedDB.open("sonneto", 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("kv", "readwrite");
      const st = tx.objectStore("kv");
      const now = Date.now();
      for (let i = 1; i <= 8; i++) st.put({ id: "v" + i, text: "Entry " + i + " body text.", createdAt: now - i * 3600000, updatedAt: now - i * 3600000, categoryId: null }, "entry:v" + i);
      st.put([{ id: "c1", name: "Heavy days", color: "#8886C9" }, { id: "c2", name: "Ideas", color: "#8FA98C" }], "categories");
      tx.oncomplete = () => res("ok");
      tx.onerror = () => res("txerr");
    };
  }));
}

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => (out.pageErrors = (out.pageErrors || []).concat(e.message)));
p.on("console", (m) => { if (m.type() === "error") out.consoleErrors = (out.consoleErrors || []).concat(m.text()); });

await p.goto(APP);
await seed(p);
await p.goto(APP);
await p.waitForTimeout(700);

// A1: white frame / body background + meta tracking + theme class
out.a1 = await p.evaluate(() => {
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const bodyMargin = getComputedStyle(document.body).margin;
  const meta = document.querySelector('meta[name="theme-color"]').content;
  return { bodyMargin, bodyBg, meta, htmlHasThemeClass: !!document.documentElement.className };
});

// toggle to dark via nav, check body bg + meta + class
await p.locator(".nav .theme-btn").click();
await p.waitForTimeout(300);
out.a1dark = await p.evaluate(() => {
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const meta = document.querySelector('meta[name="theme-color"]').content;
  const htmlClass = document.documentElement.className;
  const appHasThemeClass = !!document.querySelector(".app").classList.contains("theme-dark");
  return { bodyBg, meta, htmlClass, appHasThemeClass };
});

// A4: serif + dark weight + font loaded
out.a4 = await p.evaluate(async () => {
  const serif = getComputedStyle(document.documentElement).getPropertyValue("--serif").trim();
  const padWeight = getComputedStyle(document.querySelector(".pad")).fontWeight;
  let literataLoaded = false;
  try { literataLoaded = await document.fonts.check('16px "Literata"'); } catch {}
  return { serif, padWeight, literataLoaded };
});

// B2: contrast values as computed
out.b2 = await p.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const read = (v) => cs.getPropertyValue(v).trim();
  return { faint: read("--faint"), faintRead: read("--faint-read"), accent: read("--accent") };
});

// A3: rename a category
await p.getByRole("button", { name: "shelf", exact: true }).click();
await p.waitForTimeout(500);
await p.getByRole("button", { name: /Ideas/ }).click();
await p.waitForTimeout(400);
const h2Before = await p.locator(".shelf-head h2").textContent();
await p.locator(".shelf-head h2").click();
await p.waitForTimeout(200);
await p.locator(".rename").fill("Memory");
await p.locator(".rename").press("Enter");
await p.waitForTimeout(400);
out.a3 = {
  before: h2Before,
  after: await p.locator(".shelf-head h2").textContent(),
  chipShows: await p.getByRole("button", { name: /Memory/ }).count() > 0,
};

// back to scratchpad for the A2 drag test
await p.getByRole("button", { name: /Scratchpad/ }).click();
await p.waitForTimeout(400);

// A2: fast drag, ghost center vs cursor, into the dock and release outside the shelf
out.a2 = await (async () => {
  await p.evaluate(() => {
    window.__samp = [];
    document.addEventListener("pointermove", (e) => {
      const g = document.querySelector(".ghost");
      if (!g) return;
      const r = g.getBoundingClientRect();
      window.__samp.push({ cy: e.clientY, gcy: r.y + r.height / 2 });
    }, { capture: true, passive: true });
  });
  const r = await p.evaluate(() => { const a = document.querySelector("article"); const g = a.getBoundingClientRect(); return { x: g.x + g.width / 2, y: g.y + g.height / 2 }; });
  await p.mouse.move(r.x, r.y);
  await p.mouse.down();
  // drag quickly down through the list into the dock and past it
  for (let i = 1; i <= 40; i++) {
    await p.mouse.move(r.x, r.y + i * 12, { steps: 1 });
  }
  await p.waitForTimeout(80);
  const inDock = await p.evaluate(() => { const d = document.querySelector(".dock").getBoundingClientRect(); const g = document.querySelector(".ghost"); return g ? g.getBoundingClientRect().y > d.y : false; });
  // release way outside the shelf (top-left corner) -> should snap back
  await p.mouse.move(60, 30, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  const samps = await p.evaluate(() => window.__samp);
  let maxGap = 0;
  for (const s of samps) maxGap = Math.max(maxGap, Math.abs(s.cy - s.gcy));
  return {
    ghostReachedDock: inDock,
    maxGhostGapPx: Math.round(maxGap),
    stillLiftedAfterOutsideRelease: (await p.locator(".card-lifted").count()) > 0,
  };
})();

await browser.close();
console.log(JSON.stringify(out, null, 1));
