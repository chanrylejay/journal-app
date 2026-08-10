FIRST — GO on committing and pushing the v1.4 round. Do not hold it for this note. Track the working notes in the repo too; they are the only record of why any of these decisions were made.

SECOND — a correction I owe you. On the drag wall I gave two leads: container- scoped listeners, and per-move React re-renders. You instrumented it, found pointermove firing fine over the dock, and identified ghost lag as the real cause. You were right and my first lead was wrong — I was reasoning about the DOM from a redesign mock I wrote, where the dock sits outside the shelf, not from your actual code where it is a child. Your diagnosis stands; do not revisit it.

I also checked all five contrast values from your report against the WCAG formula. Every one matches to two decimal places. Keep measuring like that.

Standing constraints unchanged.

═══════════════ A. TWO REGRESSIONS FROM THE STICKY BAND ═══════════════

A1 — the caret hides under the cat while typing (user-blocking, highest priority) Your answer to question 1 flagged this as something for the real-device pass. It is already happening on desktop. User's words: "when typing after that long text it auto scrolls on the middle and i cant see what i type."

This is the standard sticky-footer caret problem. When the browser scrolls the caret into view it targets the viewport, which it believes is unobstructed — it has no knowledge of the band overlaying the bottom. So the caret is scrolled to a position underneath the cat.

scroll-padding-bottom on the scroll container, equal to the band's height, is the mechanism designed for exactly this. scroll-margin-bottom on the textarea is the alternative.

Requirement: while typing continuously at the end of a very long entry, the caret and its line stay fully visible above the band. Verify by typing, not by scrolling programmatically — the failure only appears when the browser decides where to scroll.

On your fallback options: do NOT reintroduce the bounded box and scrollbar. If scroll-padding does not hold on iOS, shrinking the cat is the better trade.

A2 — the cat is sitting on top of live text Screenshots show the last couple of lines legible behind the cat and the send button. That reads as a rendering fault, not a design choice. The gradient must reach full var(--paper) before the top of the cat's bounding box, not at it.

Do A1 and A2 together. Deepening the fade alone makes it worse — text you cannot see becomes invisible rather than merely obscured.

═══════════════ B. SCOPE CHANGE ═══════════════

B1 — Download all / Restore appear only on Scratchpad The user's call and I agree. Scratchpad is the default unfiltered view, so app-level utilities belong there and nowhere else. It also removes the last trace of the "does this export only this category?" ambiguity.

Hide them entirely when a category filter or a search query is active.

The intro note says "There's a download button on the shelf." Adjust only if you can do it without lengthening the sentence; otherwise leave it.

═══════════════ C. CONTRAST — RIGHT VALUES, INCOMPLETE COVERAGE ═══════════════

--faint-read went to the placeholder, empty states, and the pager. Still sitting on --faint at 3.06:1 in light:

the nav items ("write" / "shelf") — these are controls
"Download all" and "Restore" — these are controls
the date stamps
the whisper
the chip counts
the micro hints

WCAG permits 3:1 only for large text: 18.66px bold or 24px normal. Every item above is 11–13px, so all of them need 4.5:1.

The conclusion I did not expect when I raised this: almost nothing in this app is genuinely decorative. Rather than sorting each element into two buckets, collapse --faint-read back into --faint and raise the whole ramp one step. Three tiers, all readable:

LIGHT --ink 
#33304A = 11.18:1 (unchanged) --soft 
#574B72 = 7.00:1 (was 
#6E6A87 at 4.56) --faint 
#6E6A87 = 4.56:1 (was 
#8B87A1 at 3.06)

DARK --ink 
#C7C2D6 = 9.98:1 (unchanged) --soft 
#A9A3BE = 7.14:1 (unchanged) --faint 
#8C86A0 = 4.97:1 (was 
#6F6987 at 3.33)

I verified all six against the WCAG formula. The hierarchy survives — the gaps between tiers are still clearly legible as hierarchy — it just sits higher.

If you disagree, say so with numbers. In particular, look at whether light --soft at 7:1 makes the card text too heavy against --raised; that pairing is the one I cannot judge from here, and --soft carries the entire shelf.

═══════════════ QUESTIONS BACK ═══════════════

For A1, which mechanism did you use, and did you verify by actually typing?
After C lands, does the shelf still read as calm, or has raising the ramp flattened it? That is a look-at-it call and yours to make.
Same standing question: anything here you think is wrong?