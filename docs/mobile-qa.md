# Mobile Interaction QA

## Scroll Ownership

The profile form is the editing scroll container. Focus visibility correction is limited to a short window after focus or keyboard opening. Touch, pointer and wheel interaction cancels pending corrections, including the delayed focus timer. Visual viewport scrolling must not continuously pull the form back to an offscreen focused field. The viewport height is still updated independently so keyboard changes do not leave stale shell dimensions.

The regression scenario focuses a lower watermark field, scrolls upward manually, then dispatches a visual viewport scroll event. Before the correction, a scroll position of 200 was pulled back to 1751. After correction it remains 200. This reproduces one credible cause of perceived scroll locking; it is not proof of every iOS-specific scroll issue.

## Responsive Coverage

WebKit and Chromium checks cover English and Japanese at these CSS viewport sizes:

- 280x653, 320x480, 320x568, 360x640, 375x667
- 390x844, 412x915, 430x932, 480x800
- 568x280, 667x375, 740x360, 844x390, 915x412, 960x440

Checks include both scroll directions, editing area height, horizontal overflow, preview framing, layout-panel containment, crop action accessibility and export-button visibility. Low-height mobile screens use a one-line brand header while retaining language selection. Keyboard-shrink tests separately cover 390/320 widths, focused-field visibility, moving between fields and viewport panning. Additional checks cover PDF/JPEG image output and stable panel/tab/export/draft transitions after layout settling.

## Hardware Follow-Up

Desktop WebKit does not reproduce the iPhone software keyboard or native Safari touch/bounce behavior. Its mobile scroll checks use DOM scrolling and viewport events; Chromium also uses wheel input. Actual iPhone/Android checks remain necessary: edit near the bottom, drag upward and downward with the keyboard open, dismiss/reopen it, rotate, switch tabs, open/close cropping, and repeat after restoring a saved draft. Browser chrome and safe-area insets can differ from emulated viewports.
