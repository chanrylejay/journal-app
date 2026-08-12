// Confirm the corrected deployment domain serves the app.
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
const browser = await chromium.launch({ channel: "msedge" });
const out = {};
for (const url of ["https://sonneto-journal.vercel.app/", "https://sonetto-journal.vercel.app/"]) {
  try {
    const p = await browser.newPage();
    const resp = await p.goto(url, { waitUntil: "networkidle", timeout: 25000 });
    const ok = resp && resp.status() < 400;
    const app = ok ? await p.evaluate(() => !!document.querySelector(".app")).catch(() => false) : false;
    const title = ok ? await p.title() : null;
    out[url] = { status: resp ? resp.status() : "no-response", app, title };
    await p.close();
  } catch (e) {
    out[url] = { error: e.message.split("\n")[0] };
  }
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
