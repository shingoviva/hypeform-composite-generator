# Optional Second Page

- Off by default. The photo editor checkbox expands eight additional photo slots, grouped as left four and right four.
- Each half uses a two-column, two-row grid with the existing 4:5 crop ratio. Cropping, exposure, vibrance and fit-entire-image use the existing photo pipeline.
- Disabling the option hides page two without discarding its images or adjustments. Reset clears both pages. Existing drafts without the option remain single-page drafts.
- Additional photos live in the existing images map with page2-1 through page2-8 keys, so draft asset persistence and object-URL ownership cover them without a second storage mechanism.
- Both pages are visible together: stacked in narrow workspaces, side by side from a 1500px viewport. The original first-page layout is unchanged.
- PDF produces one A4 landscape document with two pages when enabled. JPEG produces two individually downloadable/shareable images. Images are rendered sequentially to bound transient canvas memory.
- Instagram whole export produces one 1080x1350 image per page (two when enabled). Split export produces left/right images per page (four when enabled), with unique page-numbered filenames and result labels.
- Both pages share the watermark component and layout calculation: right 12px, bottom 4px, image maximum 160x32px and text maximum 240x44px. Page two uses the same fitted watermark reference size as page one. Photo and name foregrounds remain above the watermark layer.
- The export renderer rasterizes watermark text after font loading to avoid html2canvas baseline differences between pages. Instagram uses the matching first-page side's fitted watermark reference size for page two.

## Verification

WebKit and Chromium passed eight file uploads, retained crop zoom 1.13 and exposure 0.2, disable/re-enable retention, restored drafts, two embedded-image PDF pages and two 2246x1588 JPEGs. Preview framing was checked at 320x568, 390x844, 844x390 and 1700x1000. Screenshots and the rasterized second PDF page were visually inspected. Existing first-page panel/tab/export/reload layout comparisons, ten-font Instagram whole/split exports and keyboard-settling tests passed. Type checking and production build passed.

Additional release checks compare watermark styles across both previews after name-font changes, compare watermark pixels in A4 and Instagram left/right output, and exercise the two-image whole and four-image split export dialogs. Text/italic/tracking/opacity and maximum-size image logos are covered.

Native iPhone keyboard, share-sheet behavior and large real-world photo collections still require device testing; desktop WebKit is not an iPhone hardware test.
