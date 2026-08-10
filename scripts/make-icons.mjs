/* Generates the PWA icons (public/icon-192.png, public/icon-512.png).
   Placeholder mark: the app's cat head on the paper background.
   Run with: node scripts/make-icons.mjs */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const blend = (c1, c2, a) => [
  Math.round(c1[0] * (1 - a) + c2[0] * a),
  Math.round(c1[1] * (1 - a) + c2[1] * a),
  Math.round(c1[2] * (1 - a) + c2[2] * a),
];

function inCircle(px, py, cx, cy, r) {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const s1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const s2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const s3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0;
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0;
  return !(hasNeg && hasPos);
}

const paper = [242, 240, 247];
const auraColor = [142, 134, 173];
const fur = [254, 253, 252];
const outline = [156, 149, 172];
const face = [82, 76, 99];
const nose = [154, 146, 172];

const EARS = [
  [
    [28, 44],
    [18, 12],
    [46, 30],
  ],
  [
    [72, 44],
    [82, 12],
    [54, 30],
  ],
];
const STROKE = 2.6;

function draw(u, v) {
  let c = paper;

  const da = Math.hypot(u - 50, v - 55);
  if (da <= 44) c = blend(c, auraColor, 0.13 * (1 - da / 44));

  for (const [A, B, C] of EARS) {
    if (inTriangle(u, v, A[0], A[1], B[0], B[1], C[0], C[1])) {
      c = fur;
    } else {
      const d = Math.min(
        segDist(u, v, A[0], A[1], B[0], B[1]),
        segDist(u, v, B[0], B[1], C[0], C[1]),
        segDist(u, v, C[0], C[1], A[0], A[1])
      );
      if (d <= STROKE) c = outline;
    }
  }

  const dh = Math.hypot(u - 50, v - 56);
  if (dh <= 27) c = fur;
  else if (dh <= 27 + STROKE) c = outline;

  if (inCircle(u, v, 41, 52, 3.4)) c = face;
  if (inCircle(u, v, 59, 52, 3.4)) c = face;
  if (inTriangle(u, v, 50, 60, 47, 63.5, 53, 63.5)) c = nose;

  return [c[0], c[1], c[2], 255];
}

function makePng(size) {
  const S = 4;
  const W = size * S;
  const px = Buffer.alloc(W * W * 4);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const u = ((x + 0.5) / W) * 100;
      const v = ((y + 0.5) / W) * 100;
      const c = draw(u, v);
      const i = (y * W + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = c[3];
    }
  }

  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const i = ((y * S + sy) * W + (x * S + sx)) * 4;
          r += px[i];
          g += px[i + 1];
          b += px[i + 2];
        }
      }
      const oi = (y * size + x) * 4;
      out[oi] = Math.round(r / (S * S));
      out[oi + 1] = Math.round(g / (S * S));
      out[oi + 2] = Math.round(b / (S * S));
      out[oi + 3] = 255;
    }
  }

  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    out.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(size, 0);
  IHDR.writeUInt32BE(size, 4);
  IHDR[8] = 8;
  IHDR[9] = 6;
  IHDR[10] = 0;
  IHDR[11] = 0;
  IHDR[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", IHDR),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });
writeFileSync("public/icon-192.png", makePng(192));
writeFileSync("public/icon-512.png", makePng(512));
console.log("icons written: public/icon-192.png, public/icon-512.png");
