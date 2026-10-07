# Portrait Layout Rationale

## Evidence and Limits

The ratios below are design decisions, not scientifically proven universal beauty ratios. No evidence reviewed here demonstrates that a particular composite-card ratio increases casting success.

- Russell (2000), *Testing the aesthetic significance of the golden-section rectangle*, found no special golden-section pattern across portrait/landscape painting categories; portrait proportions varied with the subject matter. This supports choosing proportions for the photographic subject rather than imposing a universal ratio. https://pubmed.ncbi.nlm.nih.gov/11257965/
- Russell (2000), *The aesthetics of rectangle proportion: effects of judgment scale and context*, found that preferred proportions changed with the evaluation task and context. https://pubmed.ncbi.nlm.nih.gov/10742842/
- *Faces in scenes attract rapid saccades* (2023) reports faster face-directed eye movements under specified free-viewing conditions. It supports a face-first visual hierarchy by inference, not a recommendation for an exact image size or page position. https://pubmed.ncbi.nlm.nih.gov/37552021/
- Huebner and Fillinger (2016), *Comparison of Objective Measures for Predicting Perceptual Balance and Visual Aesthetic Preference*, examines balance, symmetry and preference across different stimuli. Balance metrics are not interchangeable with aesthetic preference; the current card does not run a perceptual saliency model. https://doi.org/10.3389/fpsyg.2016.00335

## Applied Decisions

- The supplied agency-card references visually approximate 3:4 main portraits and 2:3 supporting portraits. These practical ratios accommodate a head/upper-body lead image and taller fashion/full-body supporting shots.
- A large main image and four consistently aligned supporting shots establish hierarchy. The name defaults below the photos so it does not interrupt their upper edge.
- A4 landscape (1123 x 794 layout units) is retained for existing PDF/JPEG workflows. This wider paper shape cannot reproduce the supplied near-square compositions exactly without either distortion, extra cropping or some horizontal white space.
- Standard vertical inset is 28 units, adjustable from 16 to 80. Photo frames are calculated from available height, fixed portrait ratios and bounded gaps, and centered as one group. The name/footer band has a fixed height so changing type does not resize photo frames.
- Existing crops remain intact and use `contain`; an old 4:5 crop can have small letterbox spaces in a new 3:4 / 2:3 frame. New crops use the new ratios. No saved image is silently recropped.
- Default snap points are visible and pointer drags snap within a narrow tolerance. Keyboard arrows remain unsnapped for fine control.
- Watermark type uses the same supported font weights and spacing catalog as model names. Text size, tracking and italics are editable, with bounded placement and separate space from profile text.
- Instagram remains two 1080 x 1350 JPEGs. Both retain the actual source crops using `contain`; typography and watermark choices carry over. Instagram margins are independently adjustable for its portrait format.

## Typography Rules

The card uses a name / information / secondary-label hierarchy, centered photo-column alignment, a four-unit spacing grid, name leading of 1.15, information leading of 1.4, and neutral tracking for small information text. These exact numerical values are implementation choices, not scientifically established optima. Font-specific supported weights are retained. Information text starts at 10 A4 layout units and does not shrink below 8; watermark text is capped at 80% of the fitted name size so it does not supersede the model identity.

Name and information bands reserve space based on visible information volume, margin and watermark presence, independently of requested name size. Requested type sizes are upper bounds and fit automatically when text would exceed the available band. The same fitting function is rerun after fonts load in preview and in the export clone. Instagram also reserves fixed name/information bands, so name-size changes do not resize photos. Watermarks align to the right photo-column edge on A4.

NN/g's visual hierarchy guidance supports a small number of clearly differentiated text levels and consistent grid alignment: https://www.nngroup.com/articles/principles-visual-design/

W3C's text-spacing guidance concerns avoiding content loss when spacing is overridden; its test spacing values are not universal aesthetic defaults, and this fixed-format export is not being claimed as WCAG-compliant: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html

## Validation Scope

Automated WebKit/Chromium checks cover geometry, crop preservation, default snapping, keyboard fine adjustment, draft restoration and exports. Typography is checked across ten fonts, three margins and both ends of the name-size range using representative names and profile content; this is not a guarantee for arbitrarily long pasted text. Screenshots are reviewed at desktop and phone sizes. Actual iPhone hardware and casting outcomes are not tested.
