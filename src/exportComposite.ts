import html2canvas from 'html2canvas';
import { AppState } from './types';
import { getProtectedExposureTable, getVibranceAmount } from './imageAdjustments';
import { photoContext } from './photoCanvas';
import { layoutInstagram } from './instagramLayout';

async function preparePhoto(element: HTMLImageElement, state: AppState) {
  await element.decode();
  const photo = Object.values(state.images).find(image =>
    element.style.filter.includes(`preview-image-adjustment-${image.id}`));
  if (!photo || (!photo.exposure && !photo.vibrance)) {
    const blob = await (await fetch(element.src)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read photo'));
      reader.readAsDataURL(blob);
    });
  }
  const canvas = document.createElement('canvas');
  // Bound intermediate images to avoid exhausting mobile Safari's canvas memory.
  const ratio = Math.min(1, 2200 / Math.max(element.naturalWidth, element.naturalHeight));
  canvas.width = Math.max(1, Math.round(element.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(element.naturalHeight * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing unavailable');
  context.drawImage(element, 0, 0, canvas.width, canvas.height);
  if (photo && (photo.exposure || photo.vibrance)) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const table = getProtectedExposureTable(photo.exposure).split(' ').map(Number);
    const saturation = getVibranceAmount(photo.vibrance);
    const tone = (value: number) => {
      const position = value / 255 * 32;
      const lower = Math.floor(position);
      return table[lower] + ((table[Math.min(lower + 1, 32)] - table[lower]) * (position - lower));
    };
    for (let i = 0; i < pixels.data.length; i += 4) {
      const r = tone(pixels.data[i]);
      const g = tone(pixels.data[i + 1]);
      const b = tone(pixels.data[i + 2]);
      const gray = .213 * r + .715 * g + .072 * b;
      pixels.data[i] = (gray + saturation * (r - gray)) * 255;
      pixels.data[i + 1] = (gray + saturation * (g - gray)) * 255;
      pixels.data[i + 2] = (gray + saturation * (b - gray)) * 255;
    }
    context.putImageData(pixels, 0, 0);
  }
  const result = canvas.toDataURL('image/png');
  canvas.width = canvas.height = 0;
  return result;
}

export async function renderComposite(element: HTMLElement, state: AppState, highResolution: boolean, format: 'pdf' | 'jpeg' = 'pdf', instagramSide?: 'left' | 'right') {
  await document.fonts.ready;
  const photos: string[] = [];
  for (const image of Array.from(element.querySelectorAll('img'))) {
    photos.push(await preparePhoto(image, state));
  }
  const output = document.createElement('canvas');
  const scale = instagramSide ? 1 : highResolution ? 3 : 2;
  const width = instagramSide ? 1080 : 1123;
  const height = instagramSide ? 1350 : 794;
  output.width = width * scale;
  output.height = height * scale;
  // JPEG retains P3 on supporting browsers; jsPDF's DeviceRGB output uses sRGB.
  photoContext(output, format === 'jpeg');
  return html2canvas(element, {
    canvas: output,
    backgroundColor: '#ffffff',
    scale,
    width,
    height,
    windowWidth: 1280,
    windowHeight: instagramSide ? 1500 : 1000,
    scrollX: 0,
    scrollY: 0,
    logging: false,
    onclone: async (documentClone) => {
      const target = documentClone.getElementById('composite-canvas')!;
      // Remove the preview scale and hidden mobile tab from the export layout.
      documentClone.body.replaceChildren(target);
      target.style.cssText += ';position:relative;transform:none;margin:0;box-shadow:none';
      // Tailwind 4 uses modern colors that html2canvas cannot parse directly.
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = colorCanvas.height = 1;
      const colorContext = colorCanvas.getContext('2d')!;
      const normalizeColors = () => {
        for (const node of [target, ...Array.from(target.querySelectorAll<HTMLElement>('*'))]) {
          const computed = documentClone.defaultView!.getComputedStyle(node);
          node.style.boxShadow = 'none';
          node.style.textShadow = 'none';
          for (const property of ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color']) {
            const value = computed.getPropertyValue(property);
            if (/oklch|oklab|color\(|lab\(|lch\(/.test(value)) {
              colorContext.clearRect(0, 0, 1, 1);
              colorContext.fillStyle = value;
              colorContext.fillRect(0, 0, 1, 1);
              const [r, g, b, a] = colorContext.getImageData(0, 0, 1, 1).data;
              node.style.setProperty(property, `rgba(${r},${g},${b},${a / 255})`);
            }
          }
        }
      };
      target.querySelectorAll('svg').forEach(svg => svg.remove());
      const images = Array.from(target.querySelectorAll('img'));
      for (let i = 0; i < images.length; i++) {
        images[i].src = photos[i];
        images[i].removeAttribute('srcset');
        images[i].style.filter = 'none';
        await images[i].decode();
      }
      if (instagramSide) layoutInstagram(target, state, instagramSide);
      // html2canvas does not reliably honor object-fit; bake each visible frame.
      for (const image of Array.from(target.querySelectorAll('img'))) {
        const computed = documentClone.defaultView!.getComputedStyle(image);
        const width = image.clientWidth;
        const height = image.clientHeight;
        if (!width || !height) continue;
        const frame = document.createElement('canvas');
        frame.width = Math.round(width * scale);
        frame.height = Math.round(height * scale);
        const context = photoContext(frame, format === 'jpeg')!;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, frame.width, frame.height);
        let drawWidth = frame.width;
        let drawHeight = frame.height;
        if (computed.objectFit === 'cover' || computed.objectFit === 'contain') {
          const ratio = (computed.objectFit === 'contain' ? Math.min : Math.max)(frame.width / image.naturalWidth, frame.height / image.naturalHeight);
          drawWidth = image.naturalWidth * ratio;
          drawHeight = image.naturalHeight * ratio;
        }
        context.drawImage(image, (frame.width - drawWidth) / 2, (frame.height - drawHeight) / 2, drawWidth, drawHeight);
        image.src = frame.toDataURL('image/png');
        image.style.width = `${width}px`;
        image.style.height = `${height}px`;
        await image.decode();
        frame.width = frame.height = 0;
      }
      await documentClone.fonts.ready;
      normalizeColors();
    }
  });
}
