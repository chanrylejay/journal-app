import React, { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Dusk — a small journal for loud days                               */
/*  Two screens. One warm thing on the page (the mascot). Nothing else */
/*  competing for your attention while you write.                      */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "dusk-journal:v1";

const CATEGORY_COLORS = [
  { name: "sage", dot: "#8FA98C" },
  { name: "clay", dot: "#C08D7E" },
  { name: "peri", dot: "#8886C9" },
  { name: "rose", dot: "#C094AC" },
  { name: "sea", dot: "#7FA3A8" },
];

const seed = () => ({
  entries: [],
  categories: [
    { id: "c1", name: "Heavy days", color: "#8886C9" },
    { id: "c2", name: "Ideas", color: "#8FA98C" },
  ],
});

const uid = () => Math.random().toString(36).slice(2, 10);

const softDate = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (sameDay) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
};

const timeOfDay = () => {
  const h = new Date().getHours();
  if (h < 5) return "Late";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night";
};

/* ------------------------------------------------------------------ */
/*  Cat — wide head, small body, deliberately lopsided. Nothing here is */
/*  a perfect circle and nothing mirrors exactly: the right ear is      */
/*  bigger than the left, one eye sits a pixel low, and the whole cat   */
/*  leans 1.5°. Symmetry is what made her look manufactured.            */
/* ------------------------------------------------------------------ */

const FUR = "#FEFDFC";
const GRAY = "#BDB6CA";
const GRAY_D = "#9A92AC";
const BLUSH = "#D6C5CE";
const OUT = "#9C95AC";
const FACE = "#524C63";

const HEAD_D =
  "M30 68 C30 44 47 27 79 26 C112 25 130 43 130 67 C130 89 113 106 80 106 C48 107 30 90 30 68 Z";

function Cat({ mood = "idle", gestureOverride = null, size = 118 }) {
  const [blink, setBlink] = useState(false);
  const [jump, setJump] = useState(0);
  const [gesture, setGesture] = useState(null);
  const [pulse, setPulse] = useState(0);

  /* blinking */
  useEffect(() => {
    if (mood !== "idle") return;
    let t;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, 2800 + Math.random() * 4200);
    };
    loop();
    return () => clearTimeout(t);
  }, [mood]);

  /* idle gestures — she stretches or cocks her head every half minute or so */
  useEffect(() => {
    if (mood !== "idle" || gestureOverride) return;
    let t;
    const loop = () => {
      t = setTimeout(() => {
        const g = Math.random() < 0.45 ? "stretch" : "tilt";
        setGesture(g);
        setPulse((p) => p + 1);
        setTimeout(() => setGesture(null), g === "stretch" ? 1700 : 2300);
        loop();
      }, 16000 + Math.random() * 18000);
    };
    loop();
    return () => clearTimeout(t);
  }, [mood, gestureOverride]);

  /* while previewing a gesture, replay it on a loop so it can be studied */
  useEffect(() => {
    if (!gestureOverride) return;
    setPulse((p) => p + 1);
    const i = setInterval(
      () => setPulse((p) => p + 1),
      gestureOverride === "stretch" ? 2600 : 3200
    );
    return () => clearInterval(i);
  }, [gestureOverride]);

  const jumping = jump > 0;
  const act = gestureOverride || gesture;
  const shut = !jumping && (mood === "listening" || mood === "sleeping" || act === "stretch" || blink);
  const beam = jumping || mood === "pleased";

  const boing = () => {
    setJump((n) => n + 1);
    setTimeout(() => setJump(0), 700);
  };

  const eye = (cx, cy, rx, ry) => {
    if (beam)
      return <path d={`M${cx - 8} ${cy + 3} q8 -9.5 16 0`} stroke={FACE} strokeWidth="3" fill="none" strokeLinecap="round" />;
    if (shut)
      return <path d={`M${cx - 8} ${cy - 2} q8 8.5 16 0`} stroke={FACE} strokeWidth="3" fill="none" strokeLinecap="round" />;
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={FACE} />
        <circle cx={cx + 2.2} cy={cy - 3.2} r="2" fill="#FFFFFF" opacity="0.95" />
      </g>
    );
  };

  return (
    <button className="cat-btn" onClick={boing} aria-label="Pet the cat">
      <svg
        className={`cat cat-${mood} ${jumping ? "cat-jump" : ""} ${act ? `cat-${act}` : ""}`}
        width={size}
        height={size * 0.94}
        viewBox="0 0 160 150"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8E86AD" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#8E86AD" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="patch" cx="50%" cy="50%" r="50%">
            <stop offset="48%" stopColor={GRAY} stopOpacity="0.95" />
            <stop offset="100%" stopColor={GRAY} stopOpacity="0" />
          </radialGradient>
          <filter id="soften" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <clipPath id="headClip">
            <path d={HEAD_D} />
          </clipPath>
        </defs>

        <circle className="aura" cx="80" cy="74" r="56" fill="url(#aura)" />
        <ellipse cx="79" cy="147" rx="33" ry="3.8" fill="#7A6E96" opacity="0.19" filter="url(#soften)" />

        {/* the whole cat leans slightly — hand-drawn, not installed */}
        <g transform="rotate(-1.5 80 120)">
          <g className="jumper" key={jump}>
            <g className="sit-all">
              <g className="stretcher" key={act ? `${act}-${pulse}` : "still"}>
                {/* tail */}
                <path
                  className="tail"
                  d="M118 124 C142 130 151 117 144 106"
                  stroke={GRAY}
                  strokeWidth="10.5"
                  strokeLinecap="round"
                  fill="none"
                />

                {/* body — wobbled, not an ellipse */}
                <path
                  d="M38 112 C39 97 57 89 81 89 C107 89 122 98 122 113 C122 128 103 137 79 137 C55 137 38 127 38 112 Z"
                  fill={FUR}
                  stroke={OUT}
                  strokeWidth="2"
                />

                {/* feet — two little U's peeking out from under her, no toes.
                    Filled first so they mask the body outline, then traced open. */}
                <path d="M61 127 L61 137 C61 143.5 71 143.5 71 137 L71 127 Z" fill={FUR} />
                <path
                  d="M61 127 L61 137 C61 143.5 71 143.5 71 137 L71 127"
                  fill="none"
                  stroke={OUT}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path d="M90 128 L90 138.5 C90 144.5 99.5 144.5 99.5 138.5 L99.5 128 Z" fill={FUR} />
                <path
                  d="M90 128 L90 138.5 C90 144.5 99.5 144.5 99.5 138.5 L99.5 128"
                  fill="none"
                  stroke={OUT}
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />

                <g className="head">
                  {/* ears — right one is bigger and leans out further */}
                  <g stroke={OUT} strokeWidth="2.1" strokeLinejoin="round">
                    <path d="M42 50 C34 36 33 21 40 18 C47 15 61 26 68 34 Z" fill={FUR} />
                    <path d="M120 52 C130 37 132 18 123 14 C113 10 96 25 89 34 Z" fill={FUR} />
                    <path d="M47 46 C42 36 42 28 46 27 C51 26 58 33 62 38 Z" fill={GRAY} stroke="none" />
                    <path d="M115 47 C121 36 122 27 117 26 C111 25 102 33 97 39 Z" fill={GRAY} stroke="none" />
                  </g>

                  {/* head — wider than tall */}
                  <path d={HEAD_D} fill={FUR} stroke={OUT} strokeWidth="2.2" />

                  <g clipPath="url(#headClip)">
                    <circle cx="24" cy="70" r="30" fill="url(#patch)" />
                    <circle cx="137" cy="70" r="30" fill="url(#patch)" />
                  </g>

                  {/* stripes — three on the left, two on the right */}
                  <g stroke={GRAY_D} strokeWidth="2.1" strokeLinecap="round" opacity="0.8" fill="none">
                    <path d="M36 70 C41 72 45 73.5 49 75" />
                    <path d="M34 83 C39 84 44 84.5 48 85" />
                    <path d="M37 96 C42 95 46 94 49 93" />
                    <path d="M124 71 C119 73 115 74.5 112 76" />
                    <path d="M126 84 C121 85 117 85.5 113 86" />
                  </g>

                  <ellipse cx="48" cy="86" rx="11" ry="6.5" fill={BLUSH} opacity="0.55" />
                  <ellipse cx="110" cy="85" rx="10" ry="7" fill={BLUSH} opacity="0.55" />

                  {eye(62, 72, 6.6, 8)}
                  {eye(99, 71, 6.2, 7.6)}

                  <path d="M76 79 L82 79.5 L79 83 Z" fill={GRAY_D} />
                  <path
                    d="M79 83.5 q-4.5 5 -8.5 0.6 M79 83.5 q4.5 5 8.5 0.4"
                    stroke={FACE}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />

                  {mood === "sleeping" && !jumping && (
                    <g fill="#A4A0BB" fontSize="12" fontFamily="serif">
                      <text className="zzz" x="122" y="32">z</text>
                      <text className="zzz" x="133" y="22" style={{ animationDelay: "900ms" }}>z</text>
                    </g>
                  )}
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Write                                                              */
/* ------------------------------------------------------------------ */

function WriteView({ draft, setDraft, onCommit, catMood }) {
  const ref = useRef(null);
  const [listening, setListening] = useState(false);
  const [preview, setPreview] = useState(null);
  const idleTimer = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const autoGrow = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 220) + "px";
  }, []);

  useEffect(autoGrow, [draft, autoGrow]);

  const handleChange = (e) => {
    setDraft(e.target.value);
    setListening(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setListening(false), 2200);
  };

  return (
    <div className="write">
      <p className="stamp">
        {timeOfDay()} · {softDate(Date.now())}
      </p>

      <textarea
        ref={ref}
        className="pad"
        value={draft}
        onChange={handleChange}
        onBlur={onCommit}
        placeholder="Start anywhere."
        spellCheck="false"
      />

      <div className="companion">
        <Cat
          mood={
            ["stretch", "tilt"].includes(preview)
              ? "idle"
              : preview || (listening ? "listening" : catMood || "idle")
          }
          gestureOverride={["stretch", "tilt"].includes(preview) ? preview : null}
        />
        <p className={`whisper ${draft.length === 0 && !listening ? "whisper-on" : ""}`}>
          No one else can read this.
        </p>

        {/* preview strip — delete this whole block once you've picked a look */}
        <div className="preview">
          {["idle", "listening", "pleased", "stretch", "tilt", "sleeping"].map((m) => (
            <button
              key={m}
              className={preview === m ? "on" : ""}
              onClick={() => setPreview(preview === m ? null : m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shelf — drag a card down onto a category. Or don't. Scratchpad is  */
/*  a real place to leave things, not a waiting room.                  */
/* ------------------------------------------------------------------ */

function ShelfView({ state, setState, onOpen }) {
  const [filter, setFilter] = useState(null); // null = scratchpad view
  const [drag, setDrag] = useState(null);
  const [hover, setHover] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const chipRefs = useRef({});
  const holdTimer = useRef(null);
  const startPt = useRef({ x: 0, y: 0 });

  const visible = state.entries
    .filter((e) => (filter === null ? !e.categoryId : e.categoryId === filter))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const scratchCount = state.entries.filter((e) => !e.categoryId).length;

  /* ---- pointer drag (works with mouse + touch) ---- */

  const beginHold = (e, entry) => {
    if (e.button != null && e.button !== 0) return;
    startPt.current = { x: e.clientX, y: e.clientY };
    const target = e.currentTarget;
    holdTimer.current = setTimeout(() => {
      target.setPointerCapture?.(e.pointerId);
      setDrag({ id: entry.id, text: entry.text, x: e.clientX, y: e.clientY, pointerId: e.pointerId });
    }, 180);
  };

  const moveHold = (e) => {
    if (!drag) {
      const dx = Math.abs(e.clientX - startPt.current.x);
      const dy = Math.abs(e.clientY - startPt.current.y);
      if (dx > 10 || dy > 10) clearTimeout(holdTimer.current);
      return;
    }
    e.preventDefault();
    setDrag((d) => ({ ...d, x: e.clientX, y: e.clientY }));

    let over = null;
    for (const [id, node] of Object.entries(chipRefs.current)) {
      if (!node) continue;
      const r = node.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        over = id;
      }
    }
    setHover(over);
  };

  const endHold = () => {
    clearTimeout(holdTimer.current);
    if (drag && hover) {
      const target = hover === "scratch" ? null : hover;
      setState((s) => ({
        ...s,
        entries: s.entries.map((en) => (en.id === drag.id ? { ...en, categoryId: target } : en)),
      }));
    }
    setDrag(null);
    setHover(null);
  };

  const addCategory = () => {
    const name = newName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    const color = CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length].dot;
    setState((s) => ({ ...s, categories: [...s.categories, { id: uid(), name, color }] }));
    setNewName("");
    setAdding(false);
  };

  const activeCat = state.categories.find((c) => c.id === filter);

  return (
    <div className="shelf" onPointerMove={moveHold} onPointerUp={endHold} onPointerCancel={endHold}>
      <div className="shelf-head">
        <h2>{filter === null ? "Scratchpad" : activeCat?.name}</h2>
        <span className="count">{visible.length}</span>
      </div>

      {visible.length === 0 ? (
        <p className="empty">
          {filter === null
            ? "Anything you write lands here first. It can stay here forever."
            : "Nothing filed here yet. Drag a card down onto this name."}
        </p>
      ) : (
        <div className="cards">
          {visible.map((entry) => (
            <article
              key={entry.id}
              className={`card ${drag?.id === entry.id ? "card-lifted" : ""}`}
              onPointerDown={(e) => beginHold(e, entry)}
              onClick={() => !drag && onOpen(entry.id)}
            >
              <p className="card-date">{softDate(entry.createdAt)}</p>
              <p className="card-text">{entry.text.slice(0, 180) || "—"}</p>
            </article>
          ))}
        </div>
      )}

      {/* the dock */}
      <div className={`dock ${drag ? "dock-armed" : ""}`}>
        <button
          ref={(n) => (chipRefs.current["scratch"] = n)}
          className={`chip ${filter === null ? "chip-on" : ""} ${hover === "scratch" ? "chip-hot" : ""}`}
          onClick={() => setFilter(null)}
        >
          <span className="dot" style={{ background: "#9E9AB8" }} />
          Scratchpad
          <span className="chip-n">{scratchCount}</span>
        </button>

        {state.categories.map((c) => {
          const n = state.entries.filter((e) => e.categoryId === c.id).length;
          return (
            <button
              key={c.id}
              ref={(node) => (chipRefs.current[c.id] = node)}
              className={`chip ${filter === c.id ? "chip-on" : ""} ${hover === c.id ? "chip-hot" : ""}`}
              onClick={() => setFilter(c.id)}
            >
              <span className="dot" style={{ background: c.color }} />
              {c.name}
              <span className="chip-n">{n}</span>
            </button>
          );
        })}

        {adding ? (
          <input
            className="chip chip-input"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={addCategory}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="Name it"
          />
        ) : (
          <button className="chip chip-add" onClick={() => setAdding(true)}>
            +
          </button>
        )}
      </div>

      {drag && (
        <div className="ghost" style={{ left: drag.x, top: drag.y }}>
          {drag.text.slice(0, 60) || "—"}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Reader({ entry, categories, onBack, onFile, onDelete }) {
  return (
    <div className="reader">
      <button className="back" onClick={onBack}>
        ← Back
      </button>
      <p className="stamp">{softDate(entry.createdAt)}</p>
      <p className="reader-body">{entry.text}</p>

      <div className="file-row">
        <span className="file-label">File under</span>
        <button
          className={`mini ${!entry.categoryId ? "mini-on" : ""}`}
          onClick={() => onFile(entry.id, null)}
        >
          Scratchpad
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`mini ${entry.categoryId === c.id ? "mini-on" : ""}`}
            onClick={() => onFile(entry.id, c.id)}
          >
            <span className="dot" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      <button className="delete" onClick={() => onDelete(entry.id)}>
        Delete this
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function App() {
  const [state, setState] = useState(seed);
  const [view, setView] = useState("write");
  const [draft, setDraft] = useState("");
  const [openId, setOpenId] = useState(null);
  const [catMood, setCatMood] = useState(null);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef(null);

  /* load */
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res?.value) setState(JSON.parse(res.value));
      } catch {
        /* first run, or storage unavailable — in-memory is fine */
      }
      setReady(true);
    })();
  }, []);

  /* save (debounced, one key) */
  useEffect(() => {
    if (!ready) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* keep writing regardless */
      }
    }, 500);
  }, [state, ready]);

  const commitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setState((s) => ({
      ...s,
      entries: [
        ...s.entries,
        { id: uid(), text, createdAt: Date.now(), updatedAt: Date.now(), categoryId: null },
      ],
    }));
    setDraft("");

    /* she perks up when something is kept; a long entry earns a nap */
    const long = text.length > 350;
    setCatMood("pleased");
    setTimeout(() => setCatMood(long ? "sleeping" : null), 1500);
    if (long) setTimeout(() => setCatMood(null), 16000);
  };

  const go = (next) => {
    if (view === "write") commitDraft();
    setOpenId(null);
    setView(next);
  };

  const openEntry = state.entries.find((e) => e.id === openId);

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300&display=swap');

        .app {
          --paper:  #F2F0F7;
          --raised: #FAF9FD;
          --ink:    #33304A;
          --soft:   #6E6A87;
          --faint:  #A4A0BB;
          --edge:   #E3DFEE;
          --accent: #6E6BB8;

          --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          --serif: "Newsreader", "Iowan Old Style", Palatino, Georgia, serif;

          background: var(--paper);
          color: var(--ink);
          font-family: var(--sans);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 20px 40px;
          box-sizing: border-box;
        }

        .app *, .app *::before, .app *::after { box-sizing: border-box; }

        /* ---- nav: two words, and they stay out of the way ---- */
        .nav {
          width: 100%; max-width: 620px;
          display: flex; justify-content: flex-end; gap: 22px;
          padding: 22px 2px 30px;
        }
        .nav button {
          background: none; border: 0; padding: 0; cursor: pointer;
          font: inherit; font-size: 13px; letter-spacing: 0.06em;
          text-transform: lowercase; color: var(--faint);
          transition: color 180ms ease;
        }
        .nav button:hover { color: var(--soft); }
        .nav button.on { color: var(--ink); }
        .nav button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 2px; }

        .stage { width: 100%; max-width: 620px; flex: 1; }

        /* ---- write ---- */
        .stamp {
          font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--faint); margin: 0 0 18px;
        }
        .pad {
          width: 100%; min-height: 220px; resize: none; border: 0; outline: 0;
          background: transparent; color: var(--ink);
          font-family: var(--serif); font-size: 19px; line-height: 1.75;
          overflow: hidden;
        }
        .pad::placeholder { color: var(--faint); font-style: italic; }

        .companion {
          display: flex; flex-direction: column; align-items: center;
          margin-top: 40px;
        }
        .whisper {
          font-size: 12.5px; color: var(--faint); margin: 4px 0 0;
          opacity: 0; transition: opacity 900ms ease;
        }
        .whisper-on { opacity: 1; }

        /* ---- cat ---- */
        .cat-btn {
          background: none; border: 0; padding: 0; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .cat-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; border-radius: 12px; }
        .cat { overflow: visible; display: block; }

        .aura      { transform-box: view-box; transform-origin: 80px 74px;  animation: glow 5600ms ease-in-out infinite; }
        .sit-all   { transform-box: view-box; transform-origin: 80px 140px; animation: breathe 5600ms ease-in-out infinite; }
        .tail      { transform-box: view-box; transform-origin: 118px 124px; animation: wag 2400ms ease-in-out infinite; }
        .stretcher { transform-box: view-box; transform-origin: 80px 140px; }
        .head      { transform-box: view-box; transform-origin: 80px 104px; }
        .jumper    { transform-box: view-box; transform-origin: 80px 140px; }
        .zzz       { animation: drift 3200ms ease-in-out infinite; }

        /* typing: everything downshifts */
        .cat-listening .sit-all { animation-duration: 7400ms; }
        .cat-listening .tail    { animation-duration: 5600ms; }
        .cat-listening .aura    { animation-duration: 7400ms; }

        /* saved */
        .cat-pleased .tail { animation: wag-fast 300ms ease-in-out infinite; }
        .cat-pleased .aura { animation-duration: 1400ms; }

        /* idle gestures */
        .cat-stretch .stretcher { animation: stretch 1700ms ease-in-out; }
        .cat-tilt    .head      { animation: tilt 2300ms ease-in-out; }

        /* long entry: she folds up and sleeps */
        .cat-sleeping .sit-all   { animation-duration: 9000ms; }
        .cat-sleeping .stretcher { animation: curl 1000ms ease-out forwards; }
        .cat-sleeping .head      { animation: nod 1000ms ease-out forwards; }
        .cat-sleeping .tail      { animation: curl-tail 1000ms ease-out forwards; }

        .cat-jump .jumper { animation: boing 700ms cubic-bezier(.3,.9,.4,1); }
        .cat-jump .tail   { animation: wag-fast 260ms ease-in-out infinite; }

        @keyframes breathe  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.022); } }
        @keyframes glow     { 0%,100% { opacity: .7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
        @keyframes wag      { 0%,100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
        @keyframes wag-fast { 0%,100% { transform: rotate(-21deg); } 50% { transform: rotate(21deg); } }
        @keyframes drift    { 0% { opacity: 0; transform: translate(0,0); } 30% { opacity: .85; } 100% { opacity: 0; transform: translate(7px,-15px); } }

        @keyframes stretch {
          0%   { transform: scale(1, 1)       translateY(0); }
          22%  { transform: scale(1.05, .93)  translateY(2px); }
          56%  { transform: scale(.93, 1.12)  translateY(-4px); }
          80%  { transform: scale(1.03, .97)  translateY(1px); }
          100% { transform: scale(1, 1)       translateY(0); }
        }
        @keyframes tilt {
          0%   { transform: rotate(0deg); }
          22%  { transform: rotate(-7deg); }
          70%  { transform: rotate(-7deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes curl      { to { transform: translateY(7px) scale(1.07, .88); } }
        @keyframes nod       { to { transform: translateY(8px) rotate(-6deg); } }
        @keyframes curl-tail { to { transform: rotate(-42deg); } }

        @keyframes boing {
          0%   { transform: translateY(0)     scale(1, 1); }
          13%  { transform: translateY(4px)   scale(1.09, .90); }
          38%  { transform: translateY(-26px) scale(.95, 1.07); }
          58%  { transform: translateY(0)     scale(1.08, .92); }
          76%  { transform: translateY(-5px)  scale(.99, 1.02); }
          100% { transform: translateY(0)     scale(1, 1); }
        }

        .preview { display: flex; gap: 10px; margin-top: 26px; flex-wrap: wrap; justify-content: center; }
        .preview button {
          background: none; border: 0; padding: 2px 0; cursor: pointer; font: inherit;
          font-size: 11px; letter-spacing: .05em; color: var(--faint); opacity: .65;
        }
        .preview button:hover { opacity: 1; }
        .preview button.on { color: var(--accent); opacity: 1; }

        /* ---- shelf ---- */
        .shelf { padding-bottom: 96px; }
        .shelf-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 22px; }
        .shelf-head h2 {
          font-family: var(--serif); font-weight: 400; font-size: 24px; margin: 0;
        }
        .count { font-size: 12px; color: var(--faint); }
        .empty {
          font-family: var(--serif); font-style: italic; font-size: 16px;
          color: var(--faint); line-height: 1.7; max-width: 30ch; margin: 40px 0;
        }

        .cards { display: flex; flex-direction: column; gap: 10px; }
        .card {
          background: var(--raised); border: 1px solid var(--edge); border-radius: 10px;
          padding: 14px 16px; cursor: pointer; user-select: none;
          transition: border-color 160ms ease, transform 160ms ease;
        }
        .card:hover { border-color: #D2CCE6; }
        .card-lifted { opacity: 0.32; }
        .card-date { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); margin: 0 0 6px; }
        .card-text {
          font-family: var(--serif); font-size: 15px; line-height: 1.6; margin: 0;
          color: var(--soft);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        /* ---- dock ---- */
        .dock {
          position: fixed; left: 0; right: 0; bottom: 0;
          display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;
          padding: 16px 20px 20px;
          background: linear-gradient(to top, var(--paper) 62%, rgba(242,240,247,0));
          transition: padding 200ms ease;
        }
        .dock-armed { padding-bottom: 28px; }
        .chip {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--raised); border: 1px solid var(--edge); border-radius: 999px;
          padding: 7px 14px; font: inherit; font-size: 13px; color: var(--soft);
          cursor: pointer; transition: all 160ms ease;
        }
        .chip-on { color: var(--ink); border-color: #CFC8E4; }
        .chip-hot {
          border-color: var(--accent); color: var(--accent);
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 6px 18px rgba(110,107,184,0.18);
        }
        .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        .chip-n { font-size: 11px; color: var(--faint); }
        .chip-add { padding: 7px 13px; color: var(--faint); }
        .chip-input { width: 120px; outline: none; }
        .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }

        .ghost {
          position: fixed; pointer-events: none; z-index: 50;
          transform: translate(-50%, -50%) rotate(-1.5deg);
          background: var(--raised); border: 1px solid #CFC8E4; border-radius: 10px;
          padding: 12px 14px; max-width: 240px;
          font-family: var(--serif); font-size: 14px; color: var(--soft);
          box-shadow: 0 14px 34px rgba(51,48,74,0.16);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ---- reader ---- */
        .back, .delete {
          background: none; border: 0; padding: 0; cursor: pointer; font: inherit;
          font-size: 13px; color: var(--faint);
        }
        .back:hover, .delete:hover { color: var(--soft); }
        .back { margin-bottom: 26px; }
        .reader-body {
          font-family: var(--serif); font-size: 18px; line-height: 1.8;
          white-space: pre-wrap; margin: 0 0 42px;
        }
        .file-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 40px; }
        .file-label { font-size: 12px; color: var(--faint); margin-right: 4px; }
        .mini {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: 1px solid var(--edge); border-radius: 999px;
          padding: 5px 12px; font: inherit; font-size: 12.5px; color: var(--soft); cursor: pointer;
          transition: all 150ms ease;
        }
        .mini-on { border-color: var(--accent); color: var(--accent); }

        @media (prefers-reduced-motion: reduce) {
          .app * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <nav className="nav">
        <button className={view === "write" ? "on" : ""} onClick={() => go("write")}>
          write
        </button>
        <button className={view === "shelf" ? "on" : ""} onClick={() => go("shelf")}>
          shelf
        </button>
      </nav>

      <div className="stage">
        {view === "write" && (
          <WriteView draft={draft} setDraft={setDraft} onCommit={commitDraft} catMood={catMood} />
        )}

        {view === "shelf" && !openEntry && (
          <ShelfView state={state} setState={setState} onOpen={setOpenId} />
        )}

        {view === "shelf" && openEntry && (
          <Reader
            entry={openEntry}
            categories={state.categories}
            onBack={() => setOpenId(null)}
            onFile={(id, cat) =>
              setState((s) => ({
                ...s,
                entries: s.entries.map((e) => (e.id === id ? { ...e, categoryId: cat } : e)),
              }))
            }
            onDelete={(id) => {
              setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
              setOpenId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
