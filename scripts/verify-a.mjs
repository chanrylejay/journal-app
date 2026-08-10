// A1-A4 verification for the final round.
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
    for (let i = 1; i <= 8; i++) st.put({ id: "v" + i, text: "Entry " + i + " with some words to fill a card.", createdAt: now - i * 3600000, updatedAt: now - i * 3600000, categoryId: null }, "entry:v" + i);
    st.put([{ id: "c1", name: "Heavy days", color: "#8886C9" }], "categories");
    tx.oncomplete = () => res("ok");
    tx.onerror = () => res("txerr");
  };
}));
await p.goto(APP);
await p.waitForTimeout(700);

// A1 short entry: band does not overlay text
out.short = await p.evaluate(() => {
  const t = document.querySelector(".pad").getBoundingClientRect();
  const band = document.querySelector(".write-band").getBoundingClientRect();
  return { textBottom: Math.round(t.bottom), bandTop: Math.round(band.top), bandBelowText: band.top >= t.bottom };
});

// A1 long entry: textarea grows, no internal scroll, cat + send visible
const long = "A long journal line that keeps going. ".repeat(60);
await p.locator(".pad").fill(long);
await p.waitForTimeout(400);
const atTop = await p.evaluate(() => {
  const t = document.querySelector(".pad");
  const band = document.querySelector(".write-band").getBoundingClientRect();
  const send = document.querySelector(".send").getBoundingClientRect();
  const cat = document.querySelector("svg.cat").getBoundingClientRect();
  return {
    textareaH: Math.round(t.getBoundingClientRect().height),
    hasInternalScroll: t.scrollHeight > t.clientHeight,
    overflowY: getComputedStyle(t).overflowY,
    bandBottom: Math.round(band.bottom), bandTop: Math.round(band.top),
    sendVisible: send.top > 0 && send.bottom < innerHeight,
    catVisible: cat.top > 0 && cat.bottom < innerHeight,
    sendRightAligned: Math.round(innerWidth - send.right) <= 40,
    sendRowExists: !!document.querySelector(".send-row"),
  };
});
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(300);
const atBottom = await p.evaluate(() => {
  const send = document.querySelector(".send").getBoundingClientRect();
  const cat = document.querySelector("svg.cat").getBoundingClientRect();
  return { sendVisible: send.top > 0 && send.bottom < innerHeight, catVisible: cat.top > 0 && cat.bottom < innerHeight };
});
out.long = { atTop, atBottom };

// A2: card clamp
await p.getByRole("button", { name: "shelf", exact: true }).click();
await p.waitForTimeout(500);
out.a2 = await p.evaluate(() => {
  const cs = getComputedStyle(document.querySelector(".card-text"));
  return { lineClamp: cs.webkitLineClamp };
});

// A3: header utils, no util row
out.a3 = await p.evaluate(() => ({
  downloadAll: [...document.querySelectorAll(".shelf-utils button")].map((b) => b.textContent.trim()),
  shelfUtilsCount: document.querySelectorAll(".shelf-utils button").length,
  utilRowGone: !document.querySelector(".util"),
}));
out.a3UtilPosition = await p.evaluate(() => {
  const head = document.querySelector(".shelf-head").getBoundingClientRect();
  const utils = document.querySelector(".shelf-utils").getBoundingClientRect();
  const firstCard = document.querySelector("article").getBoundingClientRect();
  return { headTop: Math.round(head.top), utilsTop: Math.round(utils.top), firstCardTop: Math.round(firstCard.top), utilsAboveCards: utils.top < firstCard.top, fixedWithHead: Math.abs(utils.top - head.top) < 10 };
});

// A4: reader margin
await p.locator("article").first().click();
await p.waitForTimeout(400);
out.a4 = await p.evaluate(() => {
  const shell = document.querySelector(".reader .pad-shell");
  if (!shell) return { hasPadShell: false };
  const before = getComputedStyle(shell, "::before");
  const body = document.querySelector(".reader-body");
  return {
    hasPadShell: true,
    paddingLeft: getComputedStyle(shell).paddingLeft,
    linePresent: before.backgroundImage.includes("linear-gradient"),
    bodyLeft: Math.round(body.getBoundingClientRect().left),
  };
});

await browser.close();
console.log(JSON.stringify(out, null, 1));
