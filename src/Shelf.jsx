import React, { useEffect, useMemo, useRef, useState } from "react";

/* Month shelf — a shelf of books behind the cat. One book per month, width
   from that month's entry count, height and colour from the month key alone.
   A month past 50 entries spawns a smaller diary beside it. Nothing is ever
   read from entry text; only createdAt and categoryId. The shelf is a record,
   not a control, so it stays visually quieter than the cat and the send. */

const LIGHT_PALETTE = ["#8492A8", "#AE8B98", "#8CA08E", "#9585AB", "#7A929C", "#B2949B", "#829E96", "#8A8DAB", "#A0808F"];
const DARK_PALETTE = ["#8A96AC", "#AE8F9C", "#90A392", "#9789AC", "#7E949E", "#B0989E", "#869F98", "#8E91AC", "#A08694"];
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/* FNV-1a 32-bit unsigned — stable per-month values */
function fnv(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

/* Category mix: top 3 buckets by count, remainder folded into the third. */
function monthMix(entries, categories) {
  const counts = new Map();
  for (const e of entries) {
    const id = e.categoryId ?? "__none__";
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const arr = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = arr.slice(0, 3);
  if (arr.length > 3) top[2][1] += arr.slice(3).reduce((s, [, n]) => s + n, 0);
  return top.map(([id, n]) => ({
    id: id === "__none__" ? null : id,
    n,
    color: id === "__none__" ? "var(--faint)" : categories.find((c) => c.id === id)?.color || "#9E9AB8",
  }));
}

/* Volumes for a month's count. First is the mother, the rest are diaries.
   f is below 1 only while the effective count is fractional (the growth
   animation), which is what makes a new book rise instead of popping in. */
function volumesFor(count) {
  const vols = [];
  let left = count;
  let guard = 0;
  while (left > 0.001 && guard < 6) {
    const e = Math.min(50, left);
    const f = Math.min(1, e);
    vols.push({ kind: vols.length === 0 ? "mother" : "diary", e, f });
    left -= e;
    guard++;
  }
  return vols;
}

function Shelf({ entries, categories, catBox, bandBox, sendBox, theme }) {
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const palette = theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;

  const [anim, setAnim] = useState(null);
  const rafRef = useRef(0);
  const prevLenRef = useRef(null);
  const [bubble, setBubble] = useState(null);
  const bubbleKeyRef = useRef(0);
  const bubbleTimer = useRef(null);

  /* growth on save: when the newest entry lands in the shelf's last month,
     animate that month's effective count old → new over ~520ms, ease-out
     cubic. Skipped entirely under prefers-reduced-motion. The raf id lives
     in a ref so StrictMode's double mount cannot start it twice. */
  useEffect(() => {
    const len = entries.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (prev == null || len <= prev) return;
    const newest = [...entries].sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!newest) return;
    const d = new Date(newest.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== lastMonthKey(entries)) return;
    const target = countForMonth(entries, key);
    if (reduced) return; /* final state uses real counts — no animation */
    cancelAnimationFrame(rafRef.current);
    const from = Math.max(0, target - 1);
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / 520);
      const e = 1 - Math.pow(1 - p, 3);
      setAnim({ key, value: from + (target - from) * e });
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = 0;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [entries, reduced]);

  useEffect(() => () => clearTimeout(bubbleTimer.current), []);

  /* months: fill every month between earliest and latest; missing ones are gaps */
  const months = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
    if (!sorted.length) return [];
    const byKey = new Map();
    for (const e of sorted) {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const gi = d.getFullYear() * 12 + d.getMonth();
      if (!byKey.has(key)) byKey.set(key, { key, gi, year: d.getFullYear(), month: d.getMonth(), entries: [] });
      byKey.get(key).entries.push(e);
    }
    const groups = [...byKey.values()].sort((a, b) => a.gi - b.gi);
    const filled = [];
    for (let gi = groups[0].gi; gi <= groups[groups.length - 1].gi; gi++) {
      const year = Math.floor(gi / 12);
      const month = gi % 12;
      const key = `${year}-${month}`;
      const g = byKey.get(key) || { key, gi, year, month, entries: [] };
      const count = anim && anim.key === key ? anim.value : g.entries.length;
      filled.push({
        key,
        gi,
        year,
        month,
        count,
        realCount: g.entries.length,
        label: year === new Date().getFullYear() ? MONTHS[month] : `${MONTHS[month]} ${year}`,
        colorIdx: ((gi % 9) + 9) % 9,
        spineH: 56 + (fnv(key + "h") % 24),
        lean: 2 + (fnv(key + "t") % 3),
        mix: monthMix(g.entries, categories),
      });
    }
    return filled;
  }, [entries, categories, anim]);

  /* layout: split the flat volume list left/right around the cat, cap the
     right side at the send button (amendment — newest books must never go
     under it), scale down if it overflows, then drop the oldest month. */
  const layout = useMemo(() => {
    if (!bandBox || !catBox) return null;
    const catX = catBox.left - bandBox.left + catBox.width / 2;
    const catTop = catBox.top - bandBox.top;
    const baseline = catTop + catBox.height * 0.976;
    const clearZone = catBox.width * 0.34;
    const tuckCap = catBox.width * 0.25;
    const sendLeft = sendBox ? sendBox.left - bandBox.left : bandBox.width;
    const rightCap = sendLeft - 8;
    /* bookend footprint: the foot reaches 10.8px past the outer book on the left, 6.2px on the right */
    const LEFT_EXT = 10.8;
    const RIGHT_EXT = 6.2;

    const books = [];
    for (const m of months) {
      if (m.count <= 0.001) continue;
      for (const v of volumesFor(m.count)) books.push({ month: m, v });
    }
    if (!books.length) return { books: [], baseline, hasBooks: false, shelfLine: false };

    const bookWidth = (b) => {
      const base = b.v.kind === "mother" ? 13 + 20 * (1 - Math.exp(-b.v.e / 18)) : 9 + 12 * (1 - Math.exp(-b.v.e / 18));
      return base * b.v.f;
    };
    const bookHeight = (b) => (b.v.kind === "mother" ? b.month.spineH : b.month.spineH * 0.66) * b.v.f;
    const gapBetween = (a, b) => {
      const diff = b.month.gi - a.month.gi;
      return diff === 0 ? 1.8 : diff === 1 ? 4.5 : 13;
    };
    const tuck = (w) => Math.min(tuckCap, Math.max(0, w - 42) * 0.26);

    /* Each block is anchored by its INNER edge (nearest the cat) at
       catCenter ± clearZone ∓ tuck(width). The send cap only clamps how far
       right the right block may extend — it never positions the block. */
    let chosen = null;
    let working = books;
    while (!chosen && working.length > 0) {
      for (let s = 1; s >= 0.66; s -= 0.05) {
        const wOf = (list) => {
          let w = 0;
          for (let i = 0; i < list.length; i++) {
            w += bookWidth(list[i]) * s;
            if (i < list.length - 1) w += gapBetween(list[i], list[i + 1]) * s;
          }
          return w;
        };
        let best = null;
        for (let cut = 0; cut <= working.length; cut++) {
          const left = working.slice(0, cut);
          const right = working.slice(cut);
          const lw = wOf(left);
          const rw = wOf(right);
          const leftInner = catX - clearZone + tuck(lw);
          const rightInner = catX + clearZone - tuck(rw);
          const leftOverflow = left.length ? leftInner - lw - LEFT_EXT < 0 : false;
          const rightOverflow = right.length ? rightInner + rw + RIGHT_EXT > rightCap : false;
          if (leftOverflow || rightOverflow) continue;
          const score = Math.abs(lw - rw) + (right.length === 0 ? 1000 : 0);
          if (!best || score < best.score) best = { cut, s, lw, rw, score };
        }
        if (best) {
          chosen = best;
          break;
        }
      }
      if (!chosen) working = working.slice(1);
    }
    if (!chosen) return { books: [], baseline, hasBooks: false, shelfLine: false };

    const scale = chosen.s;
    const leftList = working.slice(0, chosen.cut);
    const rightList = working.slice(chosen.cut);
    const leftInner = catX - clearZone + tuck(chosen.lw);
    const rightInner = catX + clearZone - tuck(chosen.rw);

    const placed = [];
    let cx = leftInner;
    for (let i = leftList.length - 1; i >= 0; i--) {
      const b = leftList[i];
      const w = bookWidth(b) * scale;
      const x = cx - w;
      placed.push({ ...b, x, w, h: bookHeight(b) * scale, side: "left" });
      cx = x - (i > 0 ? gapBetween(leftList[i - 1], leftList[i]) * scale : 0);
    }
    cx = rightInner;
    for (let i = 0; i < rightList.length; i++) {
      const b = rightList[i];
      const w = bookWidth(b) * scale;
      placed.push({ ...b, x: cx, w, h: bookHeight(b) * scale, side: "right" });
      cx += w + (i < rightList.length - 1 ? gapBetween(rightList[i], rightList[i + 1]) * scale : 0);
    }

    const leftBooks = placed.filter((p) => p.side === "left").sort((a, b) => a.x - b.x);
    const rightBooks = placed.filter((p) => p.side === "right").sort((a, b) => a.x - b.x);
    const leftBookendX = leftBooks.length ? leftBooks[0].x - 2 - 4.6 : null;
    const rightBookendX = rightBooks.length ? rightBooks[rightBooks.length - 1].x + rightBooks[rightBooks.length - 1].w + 2 : null;

    return {
      books: placed,
      baseline,
      leftBookendX,
      rightBookendX,
      hasBooks: true,
      shelfLine: true,
    };
  }, [months, bandBox, catBox, sendBox]);

  const selectMonth = (key) => {
    const m = months.find((x) => x.key === key);
    if (!m) return;
    bubbleKeyRef.current += 1;
    setBubble({ key: m.key, count: m.realCount, label: m.label, n: bubbleKeyRef.current });
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 4000);
  };

  const handleTap = (e) => {
    if (!layout?.hasBooks || !bandBox) return;
    const x = e.clientX - bandBox.left;
    let best = null;
    let bestDist = Infinity;
    for (const b of layout.books) {
      const d = Math.abs(x - (b.x + b.w / 2));
      if (d < bestDist && d <= 60) {
        bestDist = d;
        best = b;
      }
    }
    if (best) selectMonth(best.month.key);
  };

  /* bubble geometry — capsule with a pointer, floating above the cat */
  const bubbleGeo = useMemo(() => {
    if (!bubble || !bandBox || !catBox) return null;
    const bw = Math.min(292, bandBox.width * 0.75);
    const bh = Math.round((64 * bw) / 292);
    const pw = 20 * (bw / 292);
    const pd = 21 * (bw / 292);
    const catX = catBox.left - bandBox.left + catBox.width / 2;
    const catHeadY = catBox.top - bandBox.top;
    const tipY = catHeadY - 10; /* pointer tip 10px above her head */
    const svgTop = tipY - bh - pd;
    return { bw, bh, pw, pd, x: catX - bw / 2, y: svgTop };
  }, [bubble, bandBox, catBox]);

  if (!bandBox) return null;

  const bubblePath = bubbleGeo
    ? (() => {
        const r = bubbleGeo.bh / 2;
        const { bw, bh, pw, pd } = bubbleGeo;
        return [
          `M ${r} 0`,
          `H ${bw - r}`,
          `A ${r} ${r} 0 0 1 ${bw} ${r}`,
          `V ${bh - r}`,
          `A ${r} ${r} 0 0 1 ${bw - r} ${bh}`,
          `L ${bw / 2 + pw / 2} ${bh}`,
          `L ${bw / 2} ${bh + pd}`,
          `L ${bw / 2 - pw / 2} ${bh}`,
          `L ${r} ${bh}`,
          `A ${r} ${r} 0 0 1 0 ${bh - r}`,
          `V ${r}`,
          `A ${r} ${r} 0 0 1 ${r} 0`,
          "Z",
        ].join(" ");
      })()
    : null;

  return (
    <>
      <svg
        className="shelf-svg"
        aria-hidden="true"
        width={bandBox.width}
        height={bandBox.height}
        onPointerDown={handleTap}
      >
        {layout?.hasBooks && (
          <>
            {layout.books.map((b, i) => (
              <g
                key={b.month.key + "-" + i}
                data-month={b.month.key}
                data-role="book"
                transform={`translate(${b.x + b.w / 2}, ${layout.baseline}) rotate(${b.side === "left" ? b.month.lean : -b.month.lean})`}
                opacity={0.8}
              >
                <rect x={-b.w / 2} y={-b.h} width={b.w} height={b.h} rx={1} fill={palette[b.month.colorIdx]} />
                {b.w > 4 && <rect x={b.w / 2 - 2.2} y={-b.h} width={2.2} height={b.h} fill="#fff" opacity={0.14} />}
                {b.w > 14 && b.h > 22 && (
                  <g stroke="#fff" strokeWidth={1} opacity={0.6}>
                    <line x1={-b.w / 2 + 3} y1={-b.h * 0.6} x2={b.w / 2 - 4} y2={-b.h * 0.6} />
                    <line x1={-b.w / 2 + 3} y1={-b.h * 0.6 + 6} x2={b.w / 2 - 4} y2={-b.h * 0.6 + 6} />
                  </g>
                )}
                <line x1={-b.w / 2} y1={-b.h + 5} x2={b.w / 2} y2={-b.h + 5} stroke="#fff" opacity={0.24} />
                <line x1={-b.w / 2} y1={-5.5} x2={b.w / 2} y2={-5.5} stroke="#fff" opacity={0.16} />
              </g>
            ))}

            {layout.leftBookendX != null && (
              <g transform={`translate(${layout.leftBookendX}, ${layout.baseline})`} data-role="bookend">
                <rect x={0} y={-42} width={4.6} height={42} rx={1} fill="var(--out)" opacity={0.55} />
                <rect x={-4.2} y={-3} width={13} height={3} rx={1} fill="var(--out)" opacity={0.55} />
              </g>
            )}
            {layout.rightBookendX != null && (
              <g transform={`translate(${layout.rightBookendX}, ${layout.baseline})`} data-role="bookend">
                <rect x={-4.6} y={-42} width={4.6} height={42} rx={1} fill="var(--out)" opacity={0.55} />
                <rect x={-8.8} y={-3} width={13} height={3} rx={1} fill="var(--out)" opacity={0.55} />
              </g>
            )}

            <line
              data-role="shelf-line"
              x1={layout.leftBookendX != null ? layout.leftBookendX - 4.2 : layout.books.reduce((m, b) => Math.min(m, b.x), Infinity)}
              x2={layout.rightBookendX != null ? layout.rightBookendX + 4.4 : layout.books.reduce((m, b) => Math.max(m, b.x + b.w), 0)}
              y1={layout.baseline + 0.5}
              y2={layout.baseline + 0.5}
              stroke="var(--out)"
              strokeWidth={1}
              opacity={0.24}
            />
          </>
        )}
      </svg>

      <ul className="shelf-a11y">
        {months
          .filter((m) => m.realCount > 0)
          .map((m) => (
            <li key={m.key}>
              <button
                onClick={() => selectMonth(m.key)}
                aria-label={`${m.realCount} ${m.realCount === 1 ? "entry" : "entries"} in ${m.label}`}
              >
                {m.label}
              </button>
            </li>
          ))}
      </ul>

      {bubble && bubbleGeo && bubblePath && (
        <svg
          key={bubble.n}
          className="shelf-bubble"
          width={bubbleGeo.bw}
          height={bubbleGeo.bh + bubbleGeo.pd}
          style={{ left: bubbleGeo.x, top: bubbleGeo.y }}
          aria-hidden="true"
        >
          <path
            d={bubblePath}
            fill={theme === "dark" ? "#332F4A" : "#FFFFFF"}
            stroke={theme === "dark" ? "#8B83A4" : "#8F87A2"}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <text
            x={bubbleGeo.bw / 2}
            y={bubbleGeo.bh / 2 + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--serif)"
            fontSize={14}
            fill="var(--ink)"
          >
            {bubble.count} {bubble.count === 1 ? "entry" : "entries"} in {bubble.label}.
          </text>
        </svg>
      )}
    </>
  );
}

function lastMonthKey(entries) {
  if (!entries.length) return null;
  let max = null;
  for (const e of entries) {
    const d = new Date(e.createdAt);
    const gi = d.getFullYear() * 12 + d.getMonth();
    if (max == null || gi > max.gi) max = { gi, key: `${d.getFullYear()}-${d.getMonth()}` };
  }
  return max.key;
}

function countForMonth(entries, key) {
  let n = 0;
  for (const e of entries) {
    const d = new Date(e.createdAt);
    if (`${d.getFullYear()}-${d.getMonth()}` === key) n++;
  }
  return n;
}

export default React.memo(Shelf);
