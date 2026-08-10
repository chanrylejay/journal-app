// Contrast calculator for the B2 audit. Run: node scripts/contrast.mjs
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
const PAD = "#F2F0F7";
const PAPER_D = "#1B1926";
console.log("=== LIGHT (on #F2F0F7) ===");
const light = ["#A4A0BB", "#9A96B1", "#918DA7", "#8B87A1", "#85819B", "#7E7A94", "#77738D"];
for (const c of light) console.log(c, ratio(c, PAD).toFixed(2));
console.log("--faint-read light candidates:");
const lread = ["#6E6A87", "#66627D", "#5E5A73"];
for (const c of lread) console.log(c, ratio(c, PAD).toFixed(2));
console.log("--accent light candidates:");
const lac = ["#6E6BB8", "#6562AC", "#5E5BA3", "#575497", "#514E8E"];
for (const c of lac) console.log(c, ratio(c, PAD).toFixed(2));
console.log("=== DARK (on #1B1926) ===");
const dark = ["#6F6987", "#7A748F", "#847E98", "#8C86A0"];
for (const c of dark) console.log(c, ratio(c, PAPER_D).toFixed(2));
console.log("--faint-read dark candidates:");
const dread = ["#A9A3BE", "#B2ACCB", "#BAB4D2"];
for (const c of dread) console.log(c, ratio(c, PAPER_D).toFixed(2));
console.log("--accent dark (keep):", "#9B98E0", ratio("#9B98E0", PAPER_D).toFixed(2));
