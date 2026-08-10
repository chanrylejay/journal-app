// Dev-only verification tool. Uses the npx-cached Playwright (no project dependency)
// and drives the system Edge, so nothing needs downloading. Run: node scripts/verify.mjs
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);

function findPlaywright() {
  try {
    return require("playwright");
  } catch {}
  const cache = process.env.LOCALAPPDATA + "/npm-cache/_npx";
  if (!fs.existsSync(cache)) throw new Error("no npx cache at " + cache);
  const entries = fs.readdirSync(cache);
  for (const e of entries) {
    const dir = cache + "/" + e + "/node_modules/playwright";
    if (fs.existsSync(dir + "/package.json")) {
      try {
        return require(dir);
      } catch {}
    }
  }
  throw new Error("could not locate playwright in npx cache");
}

const { chromium } = findPlaywright();

const APP = process.env.APP_URL || "http://localhost:5173/";

async function seed(page) {
  await page.evaluate(() => new Promise((res) => {
    const req = indexedDB.open("sonneto", 1);
    req.onerror = () => res("err");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("kv", "readwrite");
      const st = tx.objectStore("kv");
      const now = Date.now();
      for (let i = 1; i <= 8; i++) {
        st.put({ id: "v" + i, text: "Verify entry " + i + " with enough words to fill the card body.", createdAt: now - i * 3600000, updatedAt: now - i * 3600000, categoryId: null }, "entry:v" + i);
      }
      st.put([
        { id: "c1", name: "Heavy days", color: "#8886C9" },
        { id: "c2", name: "Ideas", color: "#8FA98C" },
      ], "categories");
      tx.oncomplete = () => res("ok");
      tx.onerror = () => res("txerr");
    };
  }));
}

async function main() {
  const mode = process.argv[2] || "regression";
  const browser = await chromium.launch({ channel: "msedge" });
  const results = { mode };

  if (mode === "profile-a2") {
    results.profile = await profileA2(browser);
  } else {
    results.regression = await regression(browser);
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 1));
}

async function profileA2(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(APP);
  await seed(p);
  await p.goto(APP);
  await p.getByRole("button", { name: "shelf", exact: true }).click();
  await p.waitForTimeout(600);

  await p.evaluate(() => {
    window.__moves = [];
    document.addEventListener("pointermove", (e) => {
      const g = document.querySelector(".ghost");
      window.__moves.push({ y: Math.round(e.clientY), ghostY: g ? Math.round(g.getBoundingClientRect().y) : null, x: Math.round(e.clientX) });
    }, { capture: true, passive: true });
  });

  const dockY = await p.evaluate(() => document.querySelector(".dock").getBoundingClientRect().y);
  const r = await p.evaluate(() => { const a = document.querySelector("article"); const g = a.getBoundingClientRect(); return { x: g.x + g.width / 2, y: g.y + g.height / 2 }; });

  await p.mouse.move(r.x, r.y);
  await p.mouse.down();
  for (let i = 1; i <= 35; i++) {
    await p.mouse.move(r.x, r.y + i * 7, { steps: 1 });
    await p.waitForTimeout(10);
  }
  await p.waitForTimeout(120);
  const ghostAtDock = await p.evaluate(() => { const g = document.querySelector(".ghost"); return g ? Math.round(g.getBoundingClientRect().y) : null; });
  for (let i = 35; i >= 1; i--) {
    await p.mouse.move(r.x, r.y + i * 7, { steps: 1 });
    await p.waitForTimeout(10);
  }
  await p.mouse.up();
  await p.waitForTimeout(200);

  const moves = await p.evaluate(() => window.__moves);
  let frozeAt = null;
  let prevGhost = null;
  for (const m of moves) {
    if (m.ghostY === null) continue;
    if (prevGhost !== null && Math.abs(m.ghostY - prevGhost) <= 1 && Math.abs(m.y - prevGhost) > 6) {
      if (frozeAt === null) frozeAt = { y: m.y, ghostY: m.ghostY };
    }
    prevGhost = m.ghostY;
  }
  let maxLag = 0;
  for (const m of moves) {
    if (m.ghostY !== null) maxLag = Math.max(maxLag, Math.abs(m.y - m.ghostY));
  }
  const dockInShelf = await p.evaluate(() => {
    const dock = document.querySelector(".dock");
    let q = dock, d = 0;
    while (q && !q.classList.contains("shelf") && d < 6) { q = q.parentElement; d++; }
    return q?.classList.contains("shelf");
  });

  await ctx.close();
  return { dockY, cursorFinalY: r.y + 245, ghostAtDock, frozeAt, maxGhostLagPx: maxLag, totalMoves: moves.length, dockInShelf };
}

async function regression(browser) {
  const out = {};
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await p.goto(APP);
  await seed(p);
  await p.goto(APP);
  await p.waitForTimeout(600);

  // write -> commit
  const long = "A regression entry that should land on the shelf. ".repeat(4);
  await p.locator(".pad").fill(long);
  await p.locator(".send.on").click();
  await p.waitForTimeout(400);
  out.committed = await p.evaluate(() => document.body.innerText.includes("On the shelf."));

  // shelf
  await p.getByRole("button", { name: "shelf", exact: true }).click();
  await p.waitForTimeout(500);
  out.onShelf = (await p.locator("article").count()) >= 9;

  // mouse drag file: first card -> Ideas
  const ideas = p.getByRole("button", { name: /Ideas/ });
  const ideasBefore = (await ideas.textContent()).trim();
  const cardBox = await p.locator("article").first().boundingBox();
  const ib = await ideas.boundingBox();
  await p.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await p.mouse.down();
  await p.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2 - 14, { steps: 3 });
  await p.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 12 });
  await p.mouse.up();
  await p.waitForTimeout(400);
  out.file = { before: ideasBefore, after: (await ideas.textContent()).trim() };

  // reader edit
  await p.locator("article").first().click();
  await p.waitForTimeout(400);
  const bodyLeft = await p.evaluate(() => document.querySelector(".reader-body").getBoundingClientRect().left);
  await p.locator(".reader-body").click();
  await p.waitForTimeout(300);
  out.editShift = await p.evaluate((bl) => {
    const t = document.querySelector(".pad-read");
    return { bodyLeft: bl, textareaLeft: t.getBoundingClientRect().left };
  }, bodyLeft);

  // theme toggle
  await p.locator(".nav .theme-btn").click();
  await p.waitForTimeout(300);
  out.darkInk = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim());

  // delete confirm
  await p.getByRole("button", { name: "write", exact: true }).click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: "shelf", exact: true }).click();
  await p.waitForTimeout(400);
  await p.locator("article").first().locator(".x").click();
  await p.waitForTimeout(200);
  const confirmShown = (await p.locator(".confirm").count()) > 0;
  await p.locator(".confirm .yes").click();
  await p.waitForTimeout(300);
  out.delete = { confirmShown, stillThere: (await p.locator("article").count()) };

  // D2: the two dark palettes must match (variable declarations only)
  out.darkPaletteMatch = await p.evaluate(() => {
    const style = document.querySelector(".app style").textContent;
    const media = style.match(/@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n        \}/);
    const explicit = style.match(/html\.theme-dark \{([\s\S]*?)\n        \}/);
    if (!media || !explicit) return { found: false };
    const clean = (s) => s.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("--")).sort().join("|");
    return { found: true, match: clean(media[1]) === clean(explicit[1]) };
  });

  out.errors = errs;
  await ctx.close();
  return out;
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
