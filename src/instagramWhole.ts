import { photoContext } from './photoCanvas';

export function frameWholeComposite(source: HTMLCanvasElement, margin = 32) {
  const output = document.createElement('canvas');
  output.width = 1080; output.height = 1350;
  const context = photoContext(output, true)!;
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, 1080, 1350);
  const inset = Math.min(100, Math.max(24, margin));
  const width = 1080 - inset * 2;
  const height = width * source.height / source.width;
  const top = (1350 - height) / 2;
  context.save();
  context.shadowColor = 'rgba(0,0,0,0.14)'; context.shadowBlur = 18; context.shadowOffsetY = 5;
  context.fillRect(inset, top, width, height);
  context.restore();
  context.drawImage(source, inset, top, width, height);
  return output;
}
