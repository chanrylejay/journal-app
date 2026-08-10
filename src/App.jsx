import React, { useState, useEffect, useRef, useCallback } from "react";
import { loadAll, saveEntry, deleteEntry, saveCategories, migrateFromLocalStorage, exportAll, probeStorage, saveDraft, loadDraft, clearDraft, importBackup, seenIntro, markIntroSeen, getTheme, setTheme, seenFiling, markFilingSeen } from "./storage";

/* ------------------------------------------------------------------ */
/*  Dusk — a small journal for loud days                               */
/*  Two screens. One warm thing on the page (the mascot). Nothing else */
/*  competing for your attention while you write.                      */
/* ------------------------------------------------------------------ */

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

const HEAD_D =
  "M30 68 C30 44 47 27 79 26 C112 25 130 43 130 67 C130 89 113 106 80 106 C48 107 30 90 30 68 Z";

const IDLES = [
  { name: "long-blink", weight: 3, dur: 700 },
  { name: "ear-twitch", weight: 3, dur: 600 },
  { name: "tail-flick", weight: 2, dur: 1400 },
  { name: "look-away", weight: 2, dur: 1600 },
  { name: "tilt", weight: 2, dur: 2300 },
  { name: "stretch", weight: 1, dur: 1700 },
];

function Cat({ mood = "idle", size = 118 }) {
  const [blink, setBlink] = useState(false);
  const [jump, setJump] = useState(0);
  const [gesture, setGesture] = useState(null);
  const [pulse, setPulse] = useState(0);
  const [waking, setWaking] = useState(false);
  const prevMood = useRef(mood);
  const lastGesture = useRef(null);

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

  /* idle gestures — six weighted gestures, one at a time, gap 14-30s */
  useEffect(() => {
    if (mood !== "idle") {
      setGesture(null);
      return;
    }
    let t;
    let clearT;
    const play = () => {
      const pool = IDLES.filter((g) => g.name !== lastGesture.current);
      const total = pool.reduce((s, g) => s + g.weight, 0);
      let r = Math.random() * total;
      let chosen = pool[pool.length - 1];
      for (const g of pool) {
        r -= g.weight;
        if (r <= 0) {
          chosen = g;
          break;
        }
      }
      lastGesture.current = chosen.name;
      setGesture(chosen.name);
      setPulse((p) => p + 1);
      clearT = setTimeout(() => {
        setGesture(null);
        t = setTimeout(play, 14000 + Math.random() * 16000);
      }, chosen.dur);
    };
    t = setTimeout(play, 14000 + Math.random() * 16000);
    return () => {
      clearTimeout(t);
      clearTimeout(clearT);
    };
  }, [mood]);

  /* waking: opening eyes from listening -> resting plays on a slow scale */
  useEffect(() => {
    if (prevMood.current === "listening" && mood === "resting") {
      setWaking(true);
      const t = setTimeout(() => setWaking(false), 700);
      prevMood.current = mood;
      return () => clearTimeout(t);
    }
    prevMood.current = mood;
  }, [mood]);

  const jumping = jump > 0;
  const act = gesture;
  const shut = !jumping && (mood === "listening" || mood === "sleeping" || act === "stretch" || act === "long-blink" || blink);
  const beam = jumping || mood === "pleased";

  const boing = () => {
    setJump((n) => n + 1);
    setTimeout(() => setJump(0), 700);
  };

  const eye = (cx, cy, rx, ry) => {
    if (beam)
      return <path d={`M${cx - 8} ${cy + 3} q8 -9.5 16 0`} stroke="var(--face)" strokeWidth="3" fill="none" strokeLinecap="round" />;
    if (shut)
      return <path d={`M${cx - 8} ${cy - 2} q8 8.5 16 0`} stroke="var(--face)" strokeWidth="3" fill="none" strokeLinecap="round" />;
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="var(--face)" />
        <circle cx={cx + 2.2} cy={cy - 3.2} r="2" fill="#FFFFFF" opacity="0.95" />
      </g>
    );
  };

  return (
    <button className="cat-btn" onClick={boing} aria-label="Pet the cat">
      <svg
        className={`cat cat-${mood} ${jumping ? "cat-jump" : ""} ${waking ? "cat-waking" : ""} ${act ? `cat-${act}` : ""}`}
        width={size}
        height={size * 0.94}
        viewBox="0 0 160 150"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--aura)" stopOpacity="var(--aura-op)" />
            <stop offset="100%" stopColor="var(--aura)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="patch" cx="50%" cy="50%" r="50%">
            <stop offset="48%" stopColor="var(--gray)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--gray)" stopOpacity="0" />
          </radialGradient>
          <filter id="soften" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <clipPath id="headClip">
            <path d={HEAD_D} />
          </clipPath>
        </defs>

        <circle className="aura" cx="80" cy="74" r="56" fill="url(#aura)" />
        <ellipse cx="79" cy="147" rx="33" ry="3.8" fill="var(--cat-shadow)" opacity="var(--cat-shadow-op)" filter="url(#soften)" />

        {/* the whole cat leans slightly — hand-drawn, not installed */}
        <g transform="rotate(-1.5 80 120)">
          <g className="jumper" key={jump}>
            <g className="sit-all">
              <g className="stretcher" key={act ? `${act}-${pulse}` : "still"}>
                {/* tail */}
                <path
                  className="tail"
                  d="M118 124 C142 130 151 117 144 106"
                  stroke="var(--gray)"
                  strokeWidth="10.5"
                  strokeLinecap="round"
                  fill="none"
                />

                {/* body — wobbled, not an ellipse */}
                <path
                  d="M38 112 C39 97 57 89 81 89 C107 89 122 98 122 113 C122 128 103 137 79 137 C55 137 38 127 38 112 Z"
                  fill="var(--fur)"
                  stroke="var(--out)"
                  strokeWidth="2"
                />

                {/* feet — two little U's peeking out from under her, no toes.
                    Filled first so they mask the body outline, then traced open. */}
                <path d="M61 127 L61 137 C61 143.5 71 143.5 71 137 L71 127 Z" fill="var(--fur)" />
                <path
                  d="M61 127 L61 137 C61 143.5 71 143.5 71 137 L71 127"
                  fill="none"
                  stroke="var(--out)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path d="M90 128 L90 138.5 C90 144.5 99.5 144.5 99.5 138.5 L99.5 128 Z" fill="var(--fur)" />
                <path
                  d="M90 128 L90 138.5 C90 144.5 99.5 144.5 99.5 138.5 L99.5 128"
                  fill="none"
                  stroke="var(--out)"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />

                <g className="head">
                  {/* ears — right one is bigger and leans out further */}
                  <g stroke="var(--out)" strokeWidth="2.1" strokeLinejoin="round">
                    <path d="M42 50 C34 36 33 21 40 18 C47 15 61 26 68 34 Z" fill="var(--fur)" />
                    <path d="M47 46 C42 36 42 28 46 27 C51 26 58 33 62 38 Z" fill="var(--gray)" stroke="none" />
                    <g className="ear-r">
                      <path d="M120 52 C130 37 132 18 123 14 C113 10 96 25 89 34 Z" fill="var(--fur)" />
                      <path d="M115 47 C121 36 122 27 117 26 C111 25 102 33 97 39 Z" fill="var(--gray)" stroke="none" />
                    </g>
                  </g>

                  {/* head — wider than tall */}
                  <path d={HEAD_D} fill="var(--fur)" stroke="var(--out)" strokeWidth="2.2" />

                  <g clipPath="url(#headClip)">
                    <circle cx="24" cy="70" r="30" fill="url(#patch)" />
                    <circle cx="137" cy="70" r="30" fill="url(#patch)" />
                  </g>

                  {/* stripes — three on the left, two on the right */}
                  <g stroke="var(--gray-d)" strokeWidth="2.1" strokeLinecap="round" opacity="0.8" fill="none">
                    <path d="M36 70 C41 72 45 73.5 49 75" />
                    <path d="M34 83 C39 84 44 84.5 48 85" />
                    <path d="M37 96 C42 95 46 94 49 93" />
                    <path d="M124 71 C119 73 115 74.5 112 76" />
                    <path d="M126 84 C121 85 117 85.5 113 86" />
                  </g>

                  <ellipse cx="48" cy="86" rx="11" ry="6.5" fill="var(--blush)" opacity="0.55" />
                  <ellipse cx="110" cy="85" rx="10" ry="7" fill="var(--blush)" opacity="0.55" />

                  <g className="eyes">
                    {eye(62, 72, 6.6, 8)}
                    {eye(99, 71, 6.2, 7.6)}
                  </g>

                  <path d="M76 79 L82 79.5 L79 83 Z" fill="var(--gray-d)" />
                  <path
                    d="M79 83.5 q-4.5 5 -8.5 0.6 M79 83.5 q4.5 5 8.5 0.4"
                    stroke="var(--face)"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />

                  {mood === "sleeping" && !jumping && (
                    <g fill="var(--faint)" fontSize="12" fontFamily="serif">
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

function WriteView({ draft, setDraft, onCommit, catMood, saveDraft, draftTimer }) {
  const ref = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [justCommitted, setJustCommitted] = useState(false);
  const lastKeyRef = useRef(null);

  useEffect(() => () => clearTimeout(draftTimer.current), []);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  /* three-tier typing state: listening (0-45s), resting (45-90s), idle (90s+) */
  useEffect(() => {
    const tick = () => {
      if (lastKeyRef.current == null) return;
      const since = Date.now() - lastKeyRef.current;
      let next = "idle";
      if (since < 45000) next = "listening";
      else if (since < 90000) next = "resting";
      setPhase((p) => (p === next ? p : next));
    };
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const autoGrow = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 220) + "px";
  }, []);

  useEffect(autoGrow, [draft, autoGrow]);

  const handleChange = (e) => {
    const value = e.target.value;
    lastKeyRef.current = Date.now();
    setPhase("listening");
    setDraft(value);
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => saveDraft(value), 600);
  };

  const handleSend = async () => {
    const committed = await onCommit();
    if (committed) {
      setJustCommitted(true);
      setTimeout(() => setJustCommitted(false), 3000);
    }
    ref.current?.focus();
  };

  return (
    <div className="write">
      <p className="stamp">
        {timeOfDay()} · {softDate(Date.now())}
      </p>

      <div className="pad-shell">
        <textarea
          ref={ref}
          className="pad"
          value={draft}
          onChange={handleChange}
          onKeyDown={(e) => {
            /* no keyboard shortcut to commit: the shelf only gets what is sent */
          }}
          placeholder="Start anywhere."
          spellCheck="false"
        />
      </div>

      <div className="write-band">
        <div className="companion">
          <Cat mood={catMood || phase} />
          <p className={`whisper ${draft.length === 0 ? "whisper-on" : ""}`}>
            {justCommitted ? "On the shelf." : "No one else can read this."}
          </p>
        </div>
        <button
          className={`send ${draft.trim() ? "on" : ""}`}
          onClick={handleSend}
          aria-label="Put this on the shelf"
          title="Put this on the shelf"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shelf — drag a card down onto a category. Or don't. Scratchpad is  */
/*  a real place to leave things, not a waiting room.                  */
/* ------------------------------------------------------------------ */

function ShelfView({ state, setState, onOpen, onExport, saveEntry, saveCategories, fileRef, importMsg, onImport, deleteEntry, confirmId, setConfirmId, filter, setFilter, query, setQuery, list }) {
  const [liftedId, setLiftedId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [hover, setHover] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [showFilingHint, setShowFilingHint] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState("");
  const renameCancel = useRef(false);

  const chipRefs = useRef({});
  const holdTimer = useRef(null);
  const startPt = useRef({ x: 0, y: 0 });

  const visible = list;

  const scratchCount = state.entries.filter((e) => !e.categoryId).length;

  /* ---- pick a card up and file it ----
     Mouse picks up on 6px of movement (Chrome-tab style). A finger holds
     220ms first, because a moving finger means scroll. Once a press starts,
     move/up/cancel live on window, so no element boundary can swallow them
     mid-drag, and the ghost is positioned straight on its DOM node inside
     requestAnimationFrame so a drag never re-renders the card list. ---- */

  const pressTarget = useRef(null);
  const suppressClick = useRef(false);
  const pressEntry = useRef(null);
  const pressPtr = useRef(null);
  const pressType = useRef(null);
  const ghostRef = useRef(null);
  const rafId = useRef(0);
  const lastPt = useRef({ x: 0, y: 0 });
  const hoverRef = useRef(null);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    if (!pressing) return;
    const onMove = (e) => handlePointerMove(e);
    const onUp = (e) => handlePointerUp(e);
    const onCancel = (e) => handlePointerCancel(e);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  });

  const resetPress = () => {
    clearTimeout(holdTimer.current);
    cancelAnimationFrame(rafId.current);
    rafId.current = 0;
    setPressing(false);
    pressTarget.current = null;
    pressEntry.current = null;
    pressPtr.current = null;
    pressType.current = null;
  };

  const moveGhost = (x, y) => {
    lastPt.current.x = x;
    lastPt.current.y = y;
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      const el = ghostRef.current;
      if (el) {
        el.style.left = lastPt.current.x + "px";
        el.style.top = lastPt.current.y + "px";
      }
    });
  };

  const hitTest = (x, y) => {
    let over = null;
    for (const [id, node] of Object.entries(chipRefs.current)) {
      if (!node) continue;
      const r = node.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        over = id;
        break;
      }
    }
    if (over !== hoverRef.current) {
      hoverRef.current = over;
      setHover(over);
    }
  };

  const beginPress = (e, entry) => {
    if (e.button != null && e.button !== 0) return;
    if (confirmId === entry.id) return;
    suppressClick.current = false;
    startPt.current = { x: e.clientX, y: e.clientY };
    pressPtr.current = e.pointerId;
    pressType.current = e.pointerType;
    pressEntry.current = entry;
    pressTarget.current = e.currentTarget;
    clearTimeout(holdTimer.current);
    setPressing(true);
    if (e.pointerType !== "mouse") {
      holdTimer.current = setTimeout(() => {
        suppressClick.current = true;
        setLiftedId(entry.id);
      }, 220);
    }
  };

  const clearLift = () => {
    resetPress();
    setLiftedId(null);
    setDrag(null);
    setHover(null);
  };

  const fileToChip = (id, catId) => {
    const entry = state.entries.find((e) => e.id === id);
    if (entry) {
      const updated = { ...entry, categoryId: catId };
      setState((s) => ({
        ...s,
        entries: s.entries.map((e) => (e.id === id ? updated : e)),
      }));
      saveEntry(updated);
      if (showFilingHint) {
        markFilingSeen();
        setShowFilingHint(false);
      }
    }
    clearLift();
  };

  const handlePointerMove = (e) => {
    if (e.pointerId !== pressPtr.current) return;
    const dx = Math.abs(e.clientX - startPt.current.x);
    const dy = Math.abs(e.clientY - startPt.current.y);
    if (!liftedId) {
      if (pressType.current === "mouse") {
        const entry = pressEntry.current;
        if (entry && (dx > 6 || dy > 6)) {
          suppressClick.current = true;
          setLiftedId(entry.id);
          setDrag({ id: entry.id, text: entry.text });
          moveGhost(e.clientX, e.clientY);
        }
      } else {
        /* a moving finger is a scroll: drop the hold before it can fire */
        if (dx > 10 || dy > 10) clearTimeout(holdTimer.current);
      }
      return;
    }
    if (drag) {
      moveGhost(e.clientX, e.clientY);
      hitTest(e.clientX, e.clientY);
    } else if (e.buttons) {
      pressTarget.current?.setPointerCapture?.(e.pointerId);
      setDrag({ id: liftedId, text: pressEntry.current?.text || "" });
      moveGhost(e.clientX, e.clientY);
      hitTest(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerId !== pressPtr.current) return;
    clearTimeout(holdTimer.current);
    if (drag && hover) {
      fileToChip(drag.id, hover === "scratch" ? null : hover);
    } else if (drag) {
      setDrag(null);
      setHover(null);
      if (pressType.current === "mouse") setLiftedId(null); /* a mouse miss snaps back */
    }
    /* a touch pick that never dragged stays picked, so tapping a chip can file it */
    resetPress();
  };

  const handlePointerCancel = (e) => {
    if (e.pointerId !== pressPtr.current) return;
    clearTimeout(holdTimer.current);
    if (!liftedId) {
      resetPress(); /* nothing picked yet: it was just a scroll */
      return;
    }
    /* an active pick survives a cancelled gesture so tap-a-chip still works */
    setDrag(null);
    setHover(null);
    resetPress();
  };

  /* Escape cancels a lift (shelf only — the reader's Escape never mounts alongside) */
  useEffect(() => {
    if (!liftedId) return;
    const onKey = (e) => {
      if (e.key === "Escape") clearLift();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [liftedId]);

  /* first-run filing hint */
  useEffect(() => {
    (async () => {
      if (await seenFiling()) return;
      if (state.entries.some((e) => !e.categoryId) && state.categories.length > 0) setShowFilingHint(true);
    })();
  }, []);

  const addCategory = () => {
    const name = newName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    const color = CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length].dot;
    const nextCategories = [...state.categories, { id: uid(), name, color }];
    setState((s) => ({ ...s, categories: nextCategories }));
    saveCategories(nextCategories);
    setNewName("");
    setAdding(false);
  };

  const removeCategory = (id) => {
    if (filter === id) setFilter(null);
    const nextCategories = state.categories.filter((c) => c.id !== id);
    const updatedEntries = state.entries.map((e) => {
      if (e.categoryId === id) {
        const updated = { ...e, categoryId: null };
        saveEntry(updated);
        return updated;
      }
      return e;
    });
    setState((s) => ({
      ...s,
      entries: updatedEntries,
      categories: nextCategories,
    }));
    saveCategories(nextCategories);
  };

  const handleDelete = (id) => {
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
    deleteEntry(id);
    setConfirmId(null);
  };

  const activeCat = state.categories.find((c) => c.id === filter);
  const commitRename = () => {
    if (renameCancel.current) {
      renameCancel.current = false;
      setRenaming(false);
      return;
    }
    const name = renameText.trim();
    const cat = state.categories.find((c) => c.id === filter);
    if (cat && name && name !== cat.name) {
      const next = state.categories.map((c) => (c.id === cat.id ? { ...c, name } : c));
      setState((s) => ({ ...s, categories: next }));
      saveCategories(next);
    }
    setRenaming(false);
  };

  return (
    <div
      className="shelf"
      onClick={(e) => {
        if (liftedId && !e.target.closest(".card") && !e.target.closest(".chip")) clearLift();
      }}
    >
      <div className="shelf-head">
        {query.trim() ? (
          <h2>Results</h2>
        ) : filter === null ? (
          <h2>Scratchpad</h2>
        ) : renaming ? (
          <input
            className="rename"
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                renameCancel.current = true;
                setRenaming(false);
              }
            }}
            onBlur={commitRename}
            autoFocus
          />
        ) : (
          <h2 className="editable" onClick={() => { setRenameText(activeCat?.name || ""); setRenaming(true); }}>
            {activeCat?.name}
          </h2>
        )}
        <span className="count">{visible.length}</span>
        <div className="shelf-utils">
          <button onClick={onExport}>Download all</button>
          <button onClick={() => fileRef.current?.click()}>Restore</button>
        </div>
      </div>

      {showFilingHint && <p className="micro">Hold a card to file it.</p>}

      {state.entries.length > 10 && (
        <input
          className="search"
          value={query}
          placeholder="Search your entries"
          onChange={(e) => {
            setQuery(e.target.value);
            setFilter(null);
          }}
        />
      )}

      {visible.length === 0 ? (
        <p className="empty">
          {query.trim()
            ? "Nothing matches that."
            : filter === null
              ? "Nothing here yet. Anything you write lands here first, and it can stay here forever."
              : "Nothing filed here yet. Drag a card down onto this name."}
        </p>
      ) : (
        <div className="cards">
          {visible.map((entry) => (
            <article
              key={entry.id}
              className={`card ${liftedId === entry.id || drag?.id === entry.id ? "card-lifted" : ""}`}
              onPointerDown={(e) => beginPress(e, entry)}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                if (drag) return;
                if (liftedId === entry.id) {
                  clearLift();
                  return;
                }
                if (liftedId) return;
                if (confirmId === entry.id) return;
                onOpen(entry.id);
              }}
            >
              {confirmId === entry.id ? (
                <div className="confirm" onClick={(ev) => ev.stopPropagation()}>
                  <p>Delete this entry?</p>
                  <button className="yes" onClick={() => handleDelete(entry.id)}>
                    Delete
                  </button>
                  <button className="no" onClick={() => setConfirmId(null)}>
                    Keep
                  </button>
                </div>
              ) : (
                <>
                  <p className="card-text">{entry.text.slice(0, 180) || "—"}</p>
                  <button
                    className="x"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(entry.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Delete entry"
                  >
                    ×
                  </button>
                </>
              )}
            </article>
          ))}
        </div>
      )}

      {/* the dock */}
      {liftedId && <p className="dock-hint">Tap a category to file it.</p>}
      <div className={`dock ${drag || liftedId ? "dock-armed" : ""}`}>
        <button
          ref={(n) => (chipRefs.current["scratch"] = n)}
          className={`chip ${filter === null ? "chip-on" : ""} ${hover === "scratch" ? "chip-hot" : ""}`}
          onClick={() => {
            if (liftedId) {
              fileToChip(liftedId, null);
            } else {
              setFilter(null);
              setQuery("");
            }
          }}
        >
          <span className="dot" style={{ background: "var(--faint)" }} />
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
              onClick={() => {
                if (liftedId) {
                  fileToChip(liftedId, c.id);
                } else {
                  setFilter(c.id);
                  setQuery("");
                }
              }}
            >
              <span className="dot" style={{ background: c.color }} />
              {c.name}
              <span className="chip-n">{n}</span>
              {filter === c.id && (
                <span
                  role="button"
                  tabIndex={0}
                  className="chip-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCategory(c.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      removeCategory(c.id);
                    }
                  }}
                  aria-label={`Remove ${c.name}`}
                >
                  ×
                </span>
              )}
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
        <div
          ref={(n) => {
            ghostRef.current = n;
            if (n) {
              n.style.left = lastPt.current.x + "px";
              n.style.top = lastPt.current.y + "px";
            }
          }}
          className="ghost"
        >
          {(drag.text || "").slice(0, 60) || "—"}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
      {importMsg && <p className="micro">{importMsg}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Reader({ entry, index, listLen, onSave, onNewer, onOlder }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const ref = useRef(null);

  const startEdit = () => {
    setEditText(entry.text);
    setEditing(true);
  };

  useEffect(() => {
    if (editing) {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 288) + "px";
  }, [editText, editing]);

  const save = async () => {
    const text = editText.trim();
    if (!text || text === entry.text) return;
    const updated = { ...entry, text, updatedAt: Date.now() };
    await onSave(updated);
    setEditing(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (editing) return;
      if (e.key === "ArrowLeft") onNewer();
      else if (e.key === "ArrowRight") onOlder();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, onNewer, onOlder]);

  return (
    <div className="reader">
      <p className="stamp">
        {new Date(entry.createdAt).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}{" "}
        ·{" "}
        {new Date(entry.createdAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      <div className="pad-shell">
        {editing ? (
          <textarea
            ref={ref}
            className="pad pad-read"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                save();
              }
            }}
            spellCheck="false"
          />
        ) : (
          <p className="reader-body" onClick={startEdit}>
            {entry.text}
          </p>
        )}
      </div>

      {editing && (
        <div className="send-row">
          <button
            className={`send ${editText.trim() && editText !== entry.text ? "on" : ""}`}
            onClick={save}
            aria-label="Save this entry"
            title="Save this entry"
          >
            ↑
          </button>
        </div>
      )}

      <div className="pager">
        <button disabled={index <= 0} onClick={onNewer}>
          ← Newer
        </button>
        <button disabled={index >= listLen - 1} onClick={onOlder}>
          Older →
        </button>
      </div>
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
  const [saveFailed, setSaveFailed] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [filter, setFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [theme, setThemeState] = useState(null);
  const [osDark, setOsDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const draftTimer = useRef(null);
  const committing = useRef(false);

  /* load */
  useEffect(() => {
    (async () => {
      await migrateFromLocalStorage();
      const ok = await probeStorage();
      if (!ok) setSaveFailed(true);
      const data = await loadAll();
      if (!(await seenIntro())) setShowIntro(true);
      const savedTheme = await getTheme();
      if (savedTheme) setThemeState(savedTheme);
      const restored = await loadDraft();
      setState(data);
      setDraft(restored);
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setOsDark(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const commitDraft = async () => {
    clearTimeout(draftTimer.current);
    const text = draft.trim();
    if (!text || committing.current) return false;
    committing.current = true;
    try {
      const entry = {
        id: uid(),
        text,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        categoryId: null,
      };
      setState((s) => ({ ...s, entries: [...s.entries, entry] }));
      const ok = await saveEntry(entry);
      if (!ok) setSaveFailed(true);
      await clearDraft();
      setDraft("");
    } finally {
      committing.current = false;
    }

    /* she perks up when something is kept; a long entry earns a nap */
    const long = text.length > 350;
    setCatMood("pleased");
    setTimeout(() => setCatMood(long ? "sleeping" : null), 1500);
    if (long) setTimeout(() => setCatMood(null), 16000);

    return true;
  };

  const draftRef = useRef("");
  useEffect(() => {
    draftRef.current = draft;
  });
  const flushDraft = () => {
    clearTimeout(draftTimer.current);
    saveDraft(draftRef.current);
  };
  const flushRef = useRef(flushDraft);
  useEffect(() => {
    flushRef.current = flushDraft;
  });
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) flushRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    /* pagehide deliberately has no removal: iOS may never fire visibilitychange, and the listener dies with the page anyway */
    window.addEventListener("pagehide", () => flushRef.current());
    return () => {
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  const fileRef = useRef(null);
  const [importMsg, setImportMsg] = useState("");

  const onExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sonneto-${new Date().toLocaleDateString("en-CA")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file) => {
    try {
      const parsed = JSON.parse(await file.text());
      const res = await importBackup(parsed);
      const data = await loadAll();
      setState(data);
      setImportMsg(`Restored ${res.entries} ${res.entries === 1 ? "entry" : "entries"}.`);
    } catch {
      setImportMsg("That file didn't look like a Sonneto backup.");
    }
    setTimeout(() => setImportMsg(""), 6000);
  };

  const dismissIntro = () => {
    markIntroSeen();
    setShowIntro(false);
  };

  const go = (next) => {
    setOpenId(null);
    setView(next);
  };

  const openEntry = state.entries.find((e) => e.id === openId);

  const shelfList = state.entries
    .filter((e) => {
      const q = query.trim().toLowerCase();
      if (q) return e.text.toLowerCase().includes(q);
      return filter === null ? !e.categoryId : e.categoryId === filter;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const openIndex = openEntry ? shelfList.findIndex((e) => e.id === openEntry.id) : -1;

  const goNewer = () => {
    if (openIndex > 0) setOpenId(shelfList[openIndex - 1].id);
  };
  const goOlder = () => {
    if (openIndex < shelfList.length - 1) setOpenId(shelfList[openIndex + 1].id);
  };
  const onSave = async (updated) => {
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) => (e.id === updated.id ? updated : e)),
    }));
    const ok = await saveEntry(updated);
    if (!ok) setSaveFailed(true);
  };

  const currentShown =
    theme === "dark"
      ? "dark"
      : theme === "light"
        ? "light"
        : osDark
          ? "dark"
          : "light";
  const themeLabel = currentShown === "dark" ? "Light mode" : "Dark mode";
  const toggleTheme = () => {
    const next = currentShown === "dark" ? "light" : "dark";
    setThemeState(next);
    setTheme(next);
  };
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-dark", currentShown === "dark");
    root.classList.toggle("theme-light", currentShown === "light");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", currentShown === "dark" ? "#1B1926" : "#F2F0F7");
  }, [currentShown]);

  return (
    <div className="app">
      <style>{`

        :root {
          --paper:  #F2F0F7;
          --paper-fade: rgba(242,240,247,0);
          --raised: #FAF9FD;
          --ink:    #33304A;
          --soft:   #6E6A87;
          --faint:  #8B87A1;
          --faint-read: #6E6A87;
          --edge:   #E3DFEE;
          --rule:   #DCD7EA;
          --accent: #6562AC;
          --accent-hi: #5F5CAB;
          --accent-glow: rgba(101,98,172,.3);
          --danger: #A96A6A;
          --danger-bg: #EFE9F0;
          --warn-fg: #8A5A5A;
          --warn-bg: #F6EAEA;
          --warn-edge: #E7D2D2;
          --shadow: rgba(51,48,74,.14);
          --fur: #FEFDFC;
          --gray: #BDB6CA;
          --gray-d: #9A92AC;
          --blush: #D6C5CE;
          --out: #9C95AC;
          --face: #524C63;
          --aura: #8E86AD;
          --aura-op: 0.13;
          --cat-shadow: #7A6E96;
          --cat-shadow-op: 0.19;
          --on-accent: #FFFFFF;

          --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          --serif: "Literata", "Iowan Old Style", Palatino, Georgia, serif;
        }
        .app {
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
        @media (prefers-color-scheme: dark) {
          html:not(.theme-light) {
            --paper:  #1B1926;
            --paper-fade: rgba(27,25,38,0);
            --raised: #232131;
            --ink:    #C7C2D6;
            --soft:   #A9A3BE;
            --faint:  #6F6987;
            --faint-read: #8C86A0;
            --edge:   #322F42;
            --rule:   #3A3650;
            --accent: #9B98E0;
            --accent-hi: #ADAAE9;
            --accent-glow: rgba(155,152,224,.28);
            --danger: #C98585;
            --danger-bg: #2E2A3C;
            --warn-fg: #E0AEAE;
            --warn-bg: #302430;
            --warn-edge: #4A3A46;
            --shadow: rgba(0,0,0,.4);
            --fur: #EDE9F2;
            --gray: #A29BB5;
            --gray-d: #847C99;
            --blush: #B99AA8;
            --out: #7E7791;
            --face: #2A2637;
            --aura: #F0C97D;
            --aura-op: 0.12;
            --cat-shadow: #000000;
            --cat-shadow-op: 0.32;
            --on-accent: #1B1926;
          }
          html:not(.theme-light) .pad,
          html:not(.theme-light) .reader-body { font-weight: 450; }
        }
        html.theme-dark {
          --paper:  #1B1926;
          --paper-fade: rgba(27,25,38,0);
          --raised: #232131;
          --ink:    #C7C2D6;
          --soft:   #A9A3BE;
          --faint:  #6F6987;
          --faint-read: #8C86A0;
          --edge:   #322F42;
          --rule:   #3A3650;
          --accent: #9B98E0;
          --accent-hi: #ADAAE9;
          --accent-glow: rgba(155,152,224,.28);
          --danger: #C98585;
          --danger-bg: #2E2A3C;
          --warn-fg: #E0AEAE;
          --warn-bg: #302430;
          --warn-edge: #4A3A46;
          --shadow: rgba(0,0,0,.4);
          --fur: #EDE9F2;
          --gray: #A29BB5;
          --gray-d: #847C99;
          --blush: #B99AA8;
          --out: #7E7791;
          --face: #2A2637;
          --aura: #F0C97D;
          --aura-op: 0.12;
          --cat-shadow: #000000;
          --cat-shadow-op: 0.32;
          --on-accent: #1B1926;
        }

        .app *, .app *::before, .app *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: var(--paper); overscroll-behavior-y: contain; }

        /* ---- nav: two words, and they stay out of the way ---- */
        .nav {
          width: 100%; max-width: 620px;
          display: flex; align-items: center; gap: 22px;
          padding: 22px 2px 30px;
        }
        .nav .right { margin-left: auto; display: flex; gap: 22px; }
        .nav button {
          background: none; border: 0; padding: 14px 4px; margin: -14px 0; cursor: pointer;
          font: inherit; font-size: 13px; letter-spacing: 0.06em;
          text-transform: lowercase; color: var(--faint);
          transition: color 180ms ease;
        }
        .nav button:hover { color: var(--soft); }
        .nav button.on { color: var(--ink); }
        .nav button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 2px; }
        .nav .theme-btn { width: 44px; height: 44px; padding: 0; margin: -14px 0; display: inline-flex; align-items: center; justify-content: center; }
        .nav .theme-btn:hover { color: var(--ink); }

        .stage { width: 100%; max-width: 620px; flex: 1; }
        .warn {
          font-size: 13px; line-height: 1.6; color: var(--warn-fg);
          background: var(--warn-bg); border: 1px solid var(--warn-edge);
          border-radius: 8px; padding: 10px 14px; margin: 0 0 22px;
        }
        .micro { font-size: 11.5px; color: var(--faint); margin: -12px 0 18px; line-height: 1.6; }
        .intro { background: var(--raised); border: 1px solid var(--edge); border-radius: 10px; padding: 16px 18px; margin: 0 0 26px; }
        .intro p { font-size: 13.5px; line-height: 1.7; color: var(--soft); margin: 0 0 12px; }
        .intro button { background: none; border: 0; padding: 0; cursor: pointer; font: inherit; font-size: 13px; color: var(--accent); }

        /* ---- write ---- */
        .stamp {
          font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--faint); margin: 0 0 18px;
        }
        .pad-shell { position: relative; padding-left: 22px; }
        .pad-shell::before {
          content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 1px;
          background: linear-gradient(to bottom, var(--rule) 0%, var(--rule) 52%, transparent 100%);
        }
        .pad {
          width: 100%; min-height: 288px; resize: none; border: 0; outline: 0;
          background: transparent; color: var(--ink);
          font-family: var(--serif); font-size: 19px; line-height: 32px;
          overflow: hidden;
        }
        .pad::placeholder { color: var(--faint-read); font-style: italic; }
        .pad-read { font-size: 18.5px; line-height: 1.85; }

        .send-row { display: flex; justify-content: flex-end; height: 44px; margin-top: 10px; }
        .send {
          width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
          background: var(--accent); border: 0; color: var(--on-accent); font-size: 17px; line-height: 1;
          opacity: 0; transform: translateY(6px) scale(.9); pointer-events: none;
          transition: opacity 240ms ease, transform 240ms cubic-bezier(.3,.9,.4,1);
          box-shadow: 0 4px 14px var(--accent-glow);
        }
        .send.on { opacity: 1; transform: none; pointer-events: auto; }
        .send:hover { background: var(--accent-hi); }
        .send:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        .write-band {
          position: sticky; bottom: 0; z-index: 5;
          display: flex; flex-direction: column; align-items: center;
          padding: 18px 0 12px; margin-top: 22px;
          background: linear-gradient(to top, var(--paper) 55%, var(--paper-fade));
        }
        .write-band .send {
          position: absolute; right: 0; top: 50%; margin-top: -20px;
        }

        .companion {
          display: flex; flex-direction: column; align-items: center;
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

        /* idle gestures — replayed by remounting .stretcher */
        .ear-r { transform-box: view-box; transform-origin: 120px 52px; }
        .eyes { transform-box: view-box; transform-origin: 80px 72px; }
        .cat-ear-twitch .ear-r { animation: ear-twitch 600ms ease-in-out; }
        .cat-tail-flick .tail { animation: tail-flick 1400ms ease-in-out; }
        .cat-look-away .eyes { animation: look-away 1600ms ease-in-out; }
        .cat-waking .eyes { animation: eyes-open 700ms ease-out; }

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
        @keyframes ear-twitch { 0%,100% { transform: rotate(0deg); } 30% { transform: rotate(-9deg); } 60% { transform: rotate(4deg); } }
        @keyframes tail-flick { 0%,100% { transform: rotate(0deg); } 35% { transform: rotate(-26deg); } 70% { transform: rotate(6deg); } }
        @keyframes look-away { 0%,100% { transform: translateX(0); } 25%,70% { transform: translateX(-2.5px); } }
        @keyframes eyes-open { from { transform: scaleY(0.15); } to { transform: scaleY(1); } }

        /* ---- shelf ---- */
        .shelf { padding-bottom: 110px; touch-action: pan-y; }
        .shelf-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 22px; }
        .shelf-head h2 {
          font-family: var(--serif); font-weight: 400; font-size: 24px; margin: 0;
        }
        .shelf-head h2.editable { cursor: pointer; }
        .shelf-head h2.editable:hover { color: var(--soft); }
        .shelf-utils { margin-left: auto; display: flex; gap: 18px; align-items: baseline; }
        .shelf-utils button {
          background: none; border: 0; padding: 14px 2px; margin: -14px 0; cursor: pointer;
          font: inherit; font-size: 12.5px; color: var(--faint); white-space: nowrap;
        }
        .shelf-utils button:hover { color: var(--soft); }
        .shelf-utils button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 2px; }
        .rename {
          font-family: var(--serif); font-size: 24px; font-weight: 400;
          background: transparent; border: 0; border-bottom: 1px solid var(--rule);
          outline: none; color: var(--ink); padding: 0; width: 100%;
        }
        .count { font-size: 12px; color: var(--faint); }
        .search {
          width: 100%; background: none; border: 0; border-bottom: 1px solid var(--rule);
          outline: none; font: inherit; font-size: 14px; color: var(--ink);
          padding: 8px 0 10px; margin-bottom: 20px;
        }
        .search::placeholder { color: var(--faint-read); }
        .search:focus { border-bottom-color: var(--accent); }
        .empty {
          font-family: var(--serif); font-style: italic; font-size: 16px;
          color: var(--faint-read); line-height: 1.7; max-width: 30ch; margin: 40px 0;
        }

        .cards { display: flex; flex-direction: column; gap: 10px; }
        .card {
          position: relative; background: var(--raised); border: 1px solid var(--edge); border-radius: 10px;
          padding: 15px 46px 15px 18px; cursor: pointer; user-select: none; touch-action: pan-y;
          transition: border-color 160ms ease;
        }
        .card-lifted { opacity: .55; transform: scale(.985); }
        .card-text {
          font-family: var(--serif); font-size: 15.5px; line-height: 1.65; margin: 0;
          color: var(--soft);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .x {
          position: absolute; top: 11px; right: 11px; width: 26px; height: 26px;
          border: 0; border-radius: 50%; background: none; cursor: pointer;
          color: var(--faint); font-size: 15px; line-height: 1; opacity: .45;
          transition: all 150ms ease;
        }
        .card:hover .x { opacity: .9; }
        .x:hover { background: var(--danger-bg); color: var(--danger); opacity: 1; }
        .x:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; opacity: 1; }
        .confirm { display: flex; align-items: center; gap: 14px; padding: 3px 0; }
        .confirm p { margin: 0; font-size: 14px; color: var(--soft); flex: 1; }
        .confirm button { background: none; border: 0; padding: 0; cursor: pointer; font: inherit; font-size: 13px; }
        .yes { color: var(--danger); }
        .no { color: var(--soft); }

        /* ---- dock ---- */
        .dock {
          position: fixed; left: 0; right: 0; bottom: 0;
          display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;
          padding: 16px 20px 20px;
          background: linear-gradient(to top, var(--paper) 62%, var(--paper-fade));
          transition: padding 200ms ease;
        }
        .dock-armed { padding-bottom: 28px; }
        .dock-armed .chip { border-color: var(--accent); }
        .dock-hint { text-align: center; font-size: 12px; color: var(--faint); margin: 0 0 8px; }
        .chip {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--raised); border: 1px solid var(--edge); border-radius: 999px;
          padding: 7px 14px; font: inherit; font-size: 13px; color: var(--soft);
          cursor: pointer; transition: all 160ms ease;
        }
        .chip-on { color: var(--ink); border-color: var(--rule); }
        .chip-hot {
          border-color: var(--accent); color: var(--accent);
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 6px 18px var(--accent-glow);
        }
        .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        .chip-x { border: 0; background: none; cursor: pointer; color: var(--faint); font-size: 14px; line-height: 1; padding: 0 0 0 3px; margin-left: 1px; }
        .chip-x:hover { color: var(--danger); }
        .chip-n { font-size: 11px; color: var(--faint); }
        .chip-add { padding: 7px 13px; color: var(--faint); }
        .chip-input { width: 120px; outline: none; }
        .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }

        .ghost {
          position: fixed; pointer-events: none; z-index: 50;
          transform: translate(-50%, -50%) rotate(-1.5deg);
          background: var(--raised); border: 1px solid var(--edge); border-radius: 10px;
          padding: 12px 14px; max-width: 240px;
          font-family: var(--serif); font-size: 14px; color: var(--soft);
          box-shadow: 0 14px 34px var(--shadow);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ---- reader ---- */
        /* util row moved into the shelf header (A3) */
        .reader-body {
          font-family: var(--serif); font-size: 18.5px; line-height: 1.85;
          white-space: pre-wrap; margin: 0; cursor: pointer;
        }
        html.theme-dark .pad, html.theme-dark .reader-body { font-weight: 450; }
        .pager { display: flex; gap: 18px; margin-top: 36px; }
        .pager button {
          background: none; border: 0; cursor: pointer; font: inherit; font-size: 13px;
          color: var(--faint-read); padding: 14px 4px; margin: -14px 0; transition: color 150ms ease;
        }
        .pager button:hover:not(:disabled) { color: var(--soft); }
        .pager button:disabled { opacity: .3; cursor: default; }

        @media (prefers-reduced-motion: reduce) {
          .app * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <nav className="nav">
        {view === "shelf" && openEntry && (
          <button onClick={() => setOpenId(null)}>← back</button>
        )}
        <div className="right">
          <button className={view === "write" ? "on" : ""} onClick={() => go("write")}>
            write
          </button>
          <button className={view === "shelf" ? "on" : ""} onClick={() => go("shelf")}>
            shelf
          </button>
          <button
            className="theme-btn"
            onClick={toggleTheme}
            aria-label={currentShown === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={currentShown === "dark" ? "Light mode" : "Dark mode"}
          >
            {currentShown === "dark" ? (
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="4.2" />
                <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
                <path d="M20 13.2A7.5 7.5 0 1 1 10.8 4a6 6 0 0 0 9.2 9.2Z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      <div className="stage">
        {saveFailed && (
          <p className="warn">
            Not saving right now. Copy anything important elsewhere before you close this.
          </p>
        )}
        {showIntro && view === "write" && (
          <div className="intro">
            <p>
              Sonneto is a quiet place to write when you're feeling too much. Nothing you write
              leaves this browser — which also means clearing your browsing data will erase it.
              There's a download button on the shelf.
            </p>
            <button onClick={dismissIntro}>Okay</button>
          </div>
        )}
        {ready && view === "write" && (
          <WriteView
            draft={draft}
            setDraft={setDraft}
            onCommit={commitDraft}
            catMood={catMood}
            saveDraft={saveDraft}
            draftTimer={draftTimer}
          />
        )}

        {ready && view === "shelf" && !openEntry && (
          <ShelfView
            state={state}
            setState={setState}
            onOpen={setOpenId}
            onExport={onExport}
            saveEntry={saveEntry}
            saveCategories={saveCategories}
            fileRef={fileRef}
            importMsg={importMsg}
            onImport={onImport}
            deleteEntry={deleteEntry}
            confirmId={confirmId}
            setConfirmId={setConfirmId}
            filter={filter}
            setFilter={setFilter}
            query={query}
            setQuery={setQuery}
            list={shelfList}
          />
        )}

        {ready && view === "shelf" && openEntry && (
          <Reader
            key={openEntry.id}
            entry={openEntry}
            index={openIndex}
            listLen={shelfList.length}
            onSave={onSave}
            onNewer={goNewer}
            onOlder={goOlder}
          />
        )}
      </div>
    </div>
  );
}
