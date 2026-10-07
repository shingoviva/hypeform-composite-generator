export function photoContext(canvas: HTMLCanvasElement, wideGamut = true) {
  try {
    return canvas.getContext('2d', { colorSpace: wideGamut ? 'display-p3' : 'srgb' });
  } catch {
    return canvas.getContext('2d');
  }
}

export async function cropPhoto(source: string, area: { x: number; y: number; width: number; height: number }) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 2400 / Math.max(area.width, area.height));
  canvas.width = Math.max(1, Math.round(area.width * ratio));
  canvas.height = Math.max(1, Math.round(area.height * ratio));
  const context = photoContext(canvas);
  if (!context) throw new Error('Image processing unavailable');
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  try {
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      result => result ? resolve(result) : reject(new Error('Image processing failed')), 'image/png'));
    return URL.createObjectURL(blob);
  } finally { canvas.width = canvas.height = 0; }
}
