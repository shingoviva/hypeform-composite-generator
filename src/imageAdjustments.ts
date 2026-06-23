import { ImageData } from './types';

export const DEFAULT_EXPOSURE = 0;
export const DEFAULT_VIBRANCE = 0;

export function getProtectedExposureTable(exposure = DEFAULT_EXPOSURE): string {
  const gain = Math.pow(2, exposure);
  const steps = 32;
  const values = Array.from({ length: steps + 1 }, (_, index) => {
    const input = index / steps;
    const adjusted = (gain * input) / (1 + (gain - 1) * input);
    return adjusted.toFixed(5);
  });

  return values.join(' ');
}

export function getVibranceAmount(vibrance = DEFAULT_VIBRANCE): number {
  return Math.max(0, 1 + vibrance / 100);
}

export function getImageFilter(filterId: string): string {
  return `url(#${filterId})`;
}

export function getImageAdjustments(
  image: Pick<ImageData, 'exposure' | 'vibrance'>
) {
  return {
    exposure: image.exposure ?? DEFAULT_EXPOSURE,
    vibrance: image.vibrance ?? DEFAULT_VIBRANCE
  };
}
