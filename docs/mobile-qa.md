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

## Cross-Feature Regression Audit

WebKit and Chromium passed draft restore (including photos and exposure), reset cancellation/confirmation, unavailable-storage fallback, precise zoom and crop retention, crop cancellation, synchronized form/preview controls, long-to-short contact transitions, ten fonts across margins and sizes, maximum watermark size/opacity with protected foreground, whole/split Instagram export, and embedded-photo PDF/JPEG output. Panel/tab/export/reload transitions were compared at 390 and 1440 CSS pixels.

An intermittent approximately 0.9px name-position change was observed during tab switching. Preview fitting now explicitly requests the font weights used by canvas glyph metrics and recalculates after they load, in addition to the existing font/layout observers. The transition comparison passed on both engines after the change. This does not establish native-device keyboard behavior or eliminate every possible regression.

## Keyboard Closing Transitions

Mobile export actions and the keyboard-hidden header remain suspended after blur until visual viewport resizing has been quiet for 200ms. Moving directly between fields cancels the pending restoration; manual scrolling does not cancel it. The delayed 350ms focused-field correction is scheduled only while a text field is active, so it cannot trigger a second restoration cycle after blur.

WebKit and Chromium checks simulate keyboard height recovery from 420 through 460, 540, 660, 780 and 844px, asserting that chrome stays hidden throughout resizing and returns after settling. They also cover refocusing another field before restoration and blur without a software keyboard. Native keyboard animation still requires device confirmation.

## Quiet UI Feedback

The preview adjustment panel keeps its expanded sections and scroll offset for the editor session. Escape restores focus without scrolling. Fast draft writes retain the last displayed save status; saving is shown only after 500ms, while success and storage errors update immediately. All export modes share a busy overlay and a synchronous duplicate-operation guard; mobile result dialogs retain their existing save/share actions, while desktop downloads show a brief completion notice.

WebKit and Chromium checks cover quiet fast saves, panel close/reopen position and expanded sections, export completion and reopening the panel. Existing transition tests account for the remembered Instagram section rather than assuming it always starts collapsed.

## Native Hardware Follow-Up

Desktop WebKit does not reproduce the iPhone software keyboard or native Safari touch/bounce behavior. Its mobile scroll checks use DOM scrolling and viewport events; Chromium also uses wheel input. Actual iPhone/Android checks remain necessary: edit near the bottom, drag upward and downward with the keyboard open, dismiss/reopen it, rotate, switch tabs, open/close cropping, and repeat after restoring a saved draft. Browser chrome and safe-area insets can differ from emulated viewports.
