// STEP 1 measurement for the month-shelf brief (read-only). Run: node scripts/measure-shelf.mjs
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

async function measure(viewport, draftState) {
  const ctx = await browser.newContext({ viewport });
  const p = await ctx.newPage();
  await p.goto(APP);
  await p.waitForTimeout(700);
  if (draftState === "typing") {
    await p.locator(".pad").fill("A line of journal text that keeps going. ".repeat(8));
    await p.waitForTimeout(300);
  }
  const m = await p.evaluate(() => {
    const band = document.querySelector(".write-band").getBoundingClientRect();
    const cat = document.querySelector("svg.cat").getBoundingClientRect();
    const shadow = document.querySelector('svg.cat ellipse[fill="var(--cat-shadow)"]');
    const shadowRect = shadow ? shadow.getBoundingClientRect() : null;
    const whisper = document.querySelector(".whisper").getBoundingClientRect();
    const send = document.querySelector(".send").getBoundingClientRect();
    const pad = document.querySelector(".pad").getBoundingClientRect();
    const comp = document.querySelector(".companion").getBoundingClientRect();
    const ov = (el) => { const s = getComputedStyle(el); return { overflow: s.overflow, overflowX: s.overflowX, overflowY: s.overflowY, position: s.position, zIndex: s.zIndex }; };
    const ancestors = ["write-band", "write", "stage", "app", "body"].map((c) => {
      const el = c === "body" ? document.body : document.querySelector("." + c);
      return { name: c, ...(el ? ov(el) : {}) };
    });
    const feetLine = shadowRect ? shadowRect.top + shadowRect.height / 2 : null;
    return {
      band: { w: Math.round(band.width), h: Math.round(band.height), top: Math.round(band.top), bottom: Math.round(band.bottom) },
      cat: { w: Math.round(cat.width), h: Math.round(cat.height), top: Math.round(cat.top), bottom: Math.round(cat.bottom), left: Math.round(cat.left), right: Math.round(cat.right) },
      shadow: shadowRect ? { top: Math.round(shadowRect.top), bottom: Math.round(shadowRect.bottom), h: Math.round(shadowRect.height) } : null,
      feetLineY: feetLine !== null ? Math.round(feetLine) : null,
      roomBelowFeet: feetLine !== null ? Math.round(band.bottom - feetLine) : null,
      whisper: { top: Math.round(whisper.top), bottom: Math.round(whisper.bottom), visible: getComputedStyle(document.querySelector(".whisper")).opacity !== "0" },
      whisperVsFeet: feetLine !== null ? Math.round(whisper.top - feetLine) : null,
      send: { left: Math.round(send.left), right: Math.round(send.right), top: Math.round(send.top), bottom: Math.round(send.bottom) },
      companion: { top: Math.round(comp.top), bottom: Math.round(comp.bottom) },
      pad: { bottom: Math.round(pad.bottom) },
      roomLeft: Math.round(cat.left - band.left),
      roomRight: Math.round(band.right - cat.right),
      roomRightToSend: Math.round(send.left - cat.right),
      ancestors,
    };
  });
  await ctx.close();
  return m;
}

out.desktopEmpty = await measure({ width: 1280, height: 800 }, "empty");
out.desktopTyping = await measure({ width: 1280, height: 800 }, "typing");
out.mobileEmpty = await measure({ width: 380, height: 760 }, "empty");

// Cat silhouette extents from the viewBox paths (head/body ~30-130, tail to 144, in a 160-wide viewBox)
// print a readable summary
for (const state of ["desktopEmpty", "desktopTyping", "mobileEmpty"]) {
  const m = out[state];
  console.log("=== " + state + " ===");
  console.log("band " + JSON.stringify(m.band));
  console.log("cat " + JSON.stringify(m.cat));
  console.log("feetLineY " + m.feetLineY + "  roomBelowFeet " + m.roomBelowFeet);
  console.log("whisper top " + m.whisper.top + " bottom " + m.whisper.bottom + " vsFeet " + m.whisperVsFeet + " visible " + m.whisper.visible);
  console.log("send " + JSON.stringify(m.send));
  console.log("roomLeft " + m.roomLeft + "  roomRight " + m.roomRight + "  roomRightToSend " + m.roomRightToSend);
}
console.log("silhouette: viewBox 160x150; body/head x~30-130, tail to x=144; aura 24-136");

// screenshots for the whisper-vs-baseline call
if (!fs.existsSync(".shots")) fs.mkdirSync(".shots");
for (const [vp, state, file] of [
  [{ width: 1280, height: 800 }, "empty", ".shots/shelf-1mo-empty-draft.png"],
  [{ width: 1280, height: 800 }, "typing", ".shots/shelf-1mo-typing.png"],
  [{ width: 380, height: 760 }, "empty", ".shots/shelf-mobile-380.png"],
]) {
  const ctx = await browser.newContext({ viewport: vp });
  const p = await ctx.newPage();
  await p.goto(APP);
  await p.waitForTimeout(700);
  if (state === "typing") {
    await p.locator(".pad").fill("A line of journal text that keeps going. ".repeat(8));
    await p.waitForTimeout(300);
  }
  await p.screenshot({ path: file });
  await ctx.close();
  console.log("shot " + file);
}
await browser.close();
