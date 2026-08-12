# Sonneto

A quiet journal for days that feel like too much. A small cat keeps you company while you write.

**[sonneto-journal.vercel.app](https://sonneto-journal.vercel.app/)**

- Everything you write stays in this browser. Nothing is uploaded anywhere.
- Clearing your site data erases your entries. Use the Download button on the shelf to keep a backup.
- Run it: `npm install` then `npm run dev`, or `npm run build` for a static build.

This is a personal project — I built it for myself, because I couldn't find what I wanted. But it's MIT licensed, so if it's useful to you, take it, fork it, change the cat. No account, no signup, no server. Open the link and it's yours.

---

## Why it exists

I spent months looking for a journaling app and never found one.

Day One had a timeline I didn't need and a navbar that took up half the screen. Journey put my entries in the middle of the page behind ads. When I actually looked into it, the reason became obvious: journaling apps split into two families that never meet. The organized ones — Day One, Journey, Diaro — give you folders and tags and no warmth at all. The companion ones — Finch, Kinder World — give you a cute animal but bury the writing under goals, streaks, quizzes, and mini-games.

Nobody had built the middle. So this is the middle.

## What it does

**Write.** One screen, one text box, one cat. No prompts, no streaks, no reminders, no word count. The date is small and the box is quiet. When you're done, press the arrow.

**Shelf.** Everything lands in the Scratchpad first. Hold a card and tap a category to file it, or drag it if you're on a desktop. Filing is optional forever — the Scratchpad is a real place to leave things, not a waiting room.

**Read back.** Tap an entry to open it, click the text to edit it, move between entries with Newer and Older. Search appears once you have more than ten entries, and not before.

**Yours only.** Entries live in your browser's IndexedDB. There's no server to hack, no account to leak, no database with your worst nights in it. The tradeoff is real and deliberate: no sync between devices, and clearing your browser data erases everything. Download a backup now and then.

## The cat

She's not an image. She's about fifteen SVG shapes drawn in code, which is why she's under 2KB, sharp at any size, and can change color for dark mode for free.

She does things, and the things mean something:

- **She closes her eyes while you type.** This is the decision the whole app is built around. A cute face staring at you while you write the ugly sentence is subtly wrong. Present, not watching.
- **She opens them again** about forty-five seconds after you stop — not the moment you pause. A pause mid-sentence is the most fragile part of writing and it shouldn't be interrupted.
- **She hops** when you save something.
- **She curls up and sleeps** if you wrote more than 350 characters. You poured something out; she rests.
- **She jumps** if you press her.
- Between all that she stretches, tilts her head, twitches an ear, flicks her tail — picked at random, weighted so the small movements happen most, with fourteen to thirty seconds of stillness in between. Nothing at all while you're typing.

Nothing about her is symmetrical. The right ear is bigger than the left. One eye sits a pixel lower. Three tabby stripes on one side, two on the other. The whole cat leans 1.5°. That asymmetry did more for how she reads than any other change.

## How it got built

Seven rounds, v0.2 to v1.5, over about a week.

The design and code review ran through Claude; the implementation ran through a local CLI agent in VS Code. Claude wrote briefs, the agent built and verified in a real browser and reported back — including what it disagreed with. That last part mattered more than anything else in the process.

Some of what happened along the way:

**The animations weren't broken.** Two rounds went into debugging a mascot that wouldn't move. The cause was Reduce Motion switched on at the OS level, killing every CSS animation in the app while the React-driven parts kept working. The code was correct the entire time.

**Filing failed three times.** Drag-and-drop broke in a full-file rewrite because the brief specified the card's markup without mentioning the pointer handlers. Then it broke on touch, because the browser claims a gesture at `touchstart` and changing `touch-action` afterwards does nothing. Then it *felt* broken — which turned out to be a ghost element lagging thirty pixels behind the cursor from re-rendering on every pointer move. The last one was only found because the agent instrumented it instead of trusting the guess it had been handed.

**Storage moved twice.** It started on a browser API that only exists inside Claude artifacts and would have silently forgotten everything on deploy. Then localStorage, then IndexedDB with one key per entry — because rewriting the entire journal on every keystroke gets slow long before you run out of room.

**Saving became deliberate.** For a while, switching tabs auto-filed whatever you were writing. Now only the arrow commits. The draft still survives a reload, a tab switch, or a closed browser — it just stays a draft until you decide it isn't.

**The quiet grey failed contrast.** The secondary text colour measured 2.23:1 against a 4.5:1 standard, and it carried the nav, the dates, the buttons, and the placeholder. Invisible to me, because I already knew what all of it said.

## Some decisions I'd defend

- **Delete asks. Removing a category doesn't.** One destroys writing, the other just moves entries back to the Scratchpad. The asymmetry teaches you which is which.
- **Search shows up at eleven entries.** A search box over three cards is furniture advertising a problem you don't have.
- **No settings screen.** Dark mode follows your system unless you press the sun in the corner.
- **The writing is in a serif** (Literata) and the interface is in a plain sans. Writing your feelings in a serif feels like a letter. Writing them in a form field feels like a form.
- **No streaks, no nagging, no praise.** The cat noticing you wrote a lot is the only reward, and she does it by falling asleep.

## Still open

- No sync between devices. This is the cost of having no server.
- One category per entry, no tags.
- The Cat lives inside `App.jsx` and should be its own module.
- Long-term browser storage on iOS is unproven — write something, leave it two weeks, check it's still there.

## Built with

React 18, Vite, idb-keyval, vite-plugin-pwa, Literata. No UI library, no CSS framework, no animation library. One stylesheet, inline.

---

MIT. Made by [@chanrylejay](https://github.com/chanrylejay).
