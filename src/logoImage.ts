export async function prepareLogo(source: string): Promise<string> {
  const image = new Image(); image.src = source; await image.decode();
  const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
  const sample = document.createElement('canvas');
  sample.width = Math.round(image.naturalWidth * scale); sample.height = Math.round(image.naturalHeight * scale);
  const context = sample.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, sample.width, sample.height);
  const { data } = context.getImageData(0, 0, sample.width, sample.height);
  const corners = [0, (sample.width - 1) * 4, (sample.height - 1) * sample.width * 4, (sample.width * sample.height - 1) * 4];
  const white = (index: number) => data[index] > 245 && data[index + 1] > 245 && data[index + 2] > 245;
  const whiteBackground = corners.every(index => data[index + 3] > 240 && white(index));
  const blank = (index: number) => data[index + 3] < 16 || (whiteBackground && white(index));
  if (!corners.every(blank)) return source;
  let left = sample.width, top = sample.height, right = -1, bottom = -1;
  for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) {
    if (!blank((y * sample.width + x) * 4)) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  if (right < left) return source;
  // Preserve a protective edge around the artwork rather than the uploaded canvas.
  const padding = Math.max(2, Math.ceil(Math.max(right - left, bottom - top) * .015));
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  right = Math.min(sample.width, right + padding + 1); bottom = Math.min(sample.height, bottom + padding + 1);
  const output = document.createElement('canvas');
  output.width = Math.round((right - left) / scale); output.height = Math.round((bottom - top) / scale);
  output.getContext('2d')!.drawImage(image, left / scale, top / scale, (right - left) / scale, (bottom - top) / scale, 0, 0, output.width, output.height);
  return output.toDataURL('image/png');
}
