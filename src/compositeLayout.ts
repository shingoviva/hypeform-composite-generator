export const DEFAULT_COMPOSITE_MARGIN = 28;
export const MAIN_PHOTO_RATIO = 3 / 4;
export const SUB_PHOTO_RATIO = 2 / 3;

export function getCompositeLayout(value?: number, watermark = false, detailLength = 0) {
  const margin = Math.min(80, Math.max(16, value ?? DEFAULT_COMPOSITE_MARGIN));
  const columnGap = Math.round((20 + margin / 4) / 4) * 4;
  const photoGap = Math.round((10 + margin / 7) / 4) * 4;
  const informationReserve = Math.min(64, Math.ceil(Math.max(0, detailLength - 60) / 80) * 16);
  const footerHeight = watermark ? 144 + informationReserve + (margin > 56 ? 16 : 0) : 112 + Math.max(0, informationReserve - 32);
  const availableHeight = 794 - margin * 2 - footerHeight - 12;
  const availableWidth = 1123 - margin * 2;
  // Match the main portrait height to two smaller portraits, without stretching crops.
  const photoHeight = Math.min(availableHeight, (availableWidth - columnGap - photoGap * (1 - SUB_PHOTO_RATIO)) / (MAIN_PHOTO_RATIO + SUB_PHOTO_RATIO));
  const mainWidth = photoHeight * MAIN_PHOTO_RATIO;
  const galleryWidth = (photoHeight - photoGap) * SUB_PHOTO_RATIO + photoGap;
  return { margin, columnGap, photoGap, footerHeight, photoHeight, mainWidth, galleryWidth, width: mainWidth + columnGap + galleryWidth };
}
