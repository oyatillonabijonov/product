import { describe, it, expect } from 'vitest';
import { contentBounds, type PixelData } from './image-normalize';

// N×N RGBA grid quruvchi yordamchi: fill(x,y) → [r,g,b,a]
function grid(w: number, h: number, fill: (x: number, y: number) => [number, number, number, number]): PixelData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b, a] = fill(x, y);
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    }
  }
  return { data, width: w, height: h };
}

const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const RED: [number, number, number, number] = [220, 40, 40, 255];

describe('contentBounds', () => {
  it('oq chekkani kesib, markazdagi kontent chegarasini qaytaradi', () => {
    // 4×4: tashqi halqa oq, markaziy 2×2 qizil
    const img = grid(4, 4, (x, y) => (x >= 1 && x <= 2 && y >= 1 && y <= 2 ? RED : WHITE));
    expect(contentBounds(img)).toEqual({ x: 1, y: 1, width: 2, height: 2 });
  });

  it('bir xil rangли (butunlay oq) rasm → no-op, 0×0 qaytarmaydi', () => {
    const img = grid(4, 4, () => WHITE);
    expect(contentBounds(img)).toEqual({ x: 0, y: 0, width: 4, height: 4 });
  });

  it('maxTrimRatio dan oshadigan bo\'sh joyni kesmaydi (himoya)', () => {
    // 10×10: faqat (5,5) bitta qizil piksel; qolgani oq.
    // Standart maxTrimRatio 0.42 → har tomondan max floor(10*0.42)=4 px kesiladi.
    // Demak top/left ≥ 4 ga clamp, bottom/right ≤ 5 ga clamp qilinadi.
    const img = grid(10, 10, (x, y) => (x === 5 && y === 5 ? RED : WHITE));
    expect(contentBounds(img)).toEqual({ x: 4, y: 4, width: 2, height: 2 });
  });

  it('shaffof chekkani (alpha) kesadi', () => {
    // 4×4: tashqi halqa to'liq shaffof, markaz 2×2 qizil (alpha 255)
    const img = grid(4, 4, (x, y) => (x >= 1 && x <= 2 && y >= 1 && y <= 2 ? RED : [0, 0, 0, 0]));
    expect(contentBounds(img)).toEqual({ x: 1, y: 1, width: 2, height: 2 });
  });
});
