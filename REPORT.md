# Sonneto — Final Report

**What it is:** a quiet, local-first journal for days that feel like too much. A small animated cat keeps you company while you write. Nothing you write ever leaves the browser.

**Live:** https://sonetto-journal.vercel.app/

## Stack

React 18 + Vite + vite-plugin-pwa (installable PWA). IndexedDB via idb-keyval. Literata serif. No backend, no accounts, no network calls except the font stylesheet. All styling inline in `src/App.jsx`. Storage is one small module, `src/storage.js`.

## The project arc (v0.2 → v1.5)

- **v0.2** — IndexedDB per-entry persistence, JSON export, installable PWA (manifest + service worker).
- **v0.3** — draft persistence, migration from the old artifact, StrictMode-safe load (migration singleton).
- **v1.0** — color system with CSS variables, dark mode, explicit-commit writing, cards with delete confirm, category filing, reader rebuild with edit mode + pager, search, import/export.
- **v1.1** — press-and-hold filing, explicit theme override, on-accent contrast, pager placement.
- **v1.2** — pull-to-refresh fix (overscroll containment + touch-action pan-y), filing rewrite (input-split), dark-mode contrast softener, theme glyph in the nav, fading write margin, reader edit without layout shift.
- **v1.3** — white-frame fix (theme on `:root`/`<html>`, theme-color meta tracks), drag rewrite (window listeners + requestAnimationFrame ghost), click-to-edit category rename, Literata serif with dark weight 450, contrast ramp (`--faint` / `--faint-read` / `--accent`), filing-hint gate, pagehide comment, icons regenerated from the current cat, README, removed the dead artifact.
- **v1.4** — sticky write band (cat + send always visible, paper-fade gradient), two-line card clamp, Download all / Restore in the shelf header, reader notebook margin, Ctrl+Enter commit removed.
- **v1.5 (final)** — caret stays visible while typing (`scroll-padding-bottom` gated to the write view), band gradient reaches solid paper before the cat (no text bleed), Download all / Restore show only on Scratchpad, contrast ramp raised (`--faint-read` collapsed back into `--faint`).

## The cat

A hand-drawn SVG, deliberately asymmetric (the right ear is bigger, one eye sits a pixel low, the whole cat leans 1.5°). Three-tier typing state — listening (0–45s), resting (45–90s), idle (90s+). Six weighted idle gestures (long-blink, ear-twitch, tail-flick, look-away, tilt, stretch) with 14–30s gaps and no repeats. She naps on long entries and jumps when petted. All client-side, no assets.

## Filing — the interaction that failed twice

Input-split by design. A **mouse** picks a card up the instant it moves 6px — Chrome-tab style, no hold. A **finger** holds 220ms first (a moving finger must scroll), then the pick survives release and tapping a category files it. The ghost tracks the pointer 1:1 via requestAnimationFrame (never re-renders the card list), and drag move/up/cancel live on `window` so no element boundary can swallow them. Root causes of the two earlier failures: `touch-action: auto` let the browser steal the gesture, and a latent crash where the ghost read `drag.text` that wasn't set.

## Verification

Every round was verified in a real browser (Playwright driving Edge): mouse via real pointer events, touch via CDP in a mobile-emulated context. `scripts/verify.mjs` is the regression net — write → commit → file → edit → theme → delete, plus a check that the two dark palettes still match. Screenshots for visual review live in `.shots/`. The live site was checked on deploy: renders, cat present, Literata loads, no console errors.

## Deployment

Vercel, production, git-integrated — pushes to `main` auto-deploy. The PWA installs to a home screen with the current cat icon.

## Open items (post-shipping)

- **Real-device pass (iOS + Android)** — the one thing emulation can't prove: dark mode has no white frame and a dark status bar; holding a card 2s doesn't reload; a finger scrolls, a hold-then-tap files; the home-screen icon is the cat; a long entry in dark keeps the cat visible and the last line legible.
- **D1 — extract the Cat** to its own file: ~270 lines of frozen SVG inside a 1,678-line App.jsx, protected only by a constraint line in every brief.
- **Card-text contrast** is 7.55:1 (light `--soft` on `--raised`) after the ramp raise — readable but heavy; worth a look if the shelf reads too dense.
- **iOS scroll-padding**: the caret-above-band fix relies on `scroll-padding-bottom`; if iOS ignores it, the fallback is shrinking the cat.

## Not in scope (parked on purpose)

Search-result highlighting, any device sync, the Neon backup, removing the Newer/Older pager.
