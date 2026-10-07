export const DEFAULT_COMPOSITE_MARGIN = 28;
export const MAIN_PHOTO_RATIO = 3 / 4;
export const SUB_PHOTO_RATIO = 2 / 3;

export function getCompositeLayout(value?: number) {
  const margin = Math.min(80, Math.max(16, value ?? DEFAULT_COMPOSITE_MARGIN));
  const columnGap = Math.round(20 + margin / 4);
  const photoGap = Math.round(10 + margin / 7);
  const availableHeight = 794 - margin * 2 - 112;
  const availableWidth = 1123 - margin * 2;
  // Match the main portrait height to two smaller portraits, without stretching crops.
  const photoHeight = Math.min(availableHeight, (availableWidth - columnGap - photoGap * (1 - SUB_PHOTO_RATIO)) / (MAIN_PHOTO_RATIO + SUB_PHOTO_RATIO));
  const mainWidth = photoHeight * MAIN_PHOTO_RATIO;
  const galleryWidth = (photoHeight - photoGap) * SUB_PHOTO_RATIO + photoGap;
  return { margin, columnGap, photoGap, photoHeight, mainWidth, galleryWidth, width: mainWidth + columnGap + galleryWidth };
}
