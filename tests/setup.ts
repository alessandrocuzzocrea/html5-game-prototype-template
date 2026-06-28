import { vi } from 'vitest';

// Mock canvas 2D context methods
const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  shadowColor: '',
  shadowBlur: 0,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  font: '',
  textAlign: '',
  textBaseline: '',
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  roundRect: vi.fn(),
} as unknown as CanvasRenderingContext2D;

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === '2d') return mockCtx;
  return null;
}) as any;

// Mock Image to fire onload synchronously
const OrigImage = globalThis.Image;

vi.stubGlobal('Image', class MockImage {
  onload: (() => void) | null = null;
  src = '';
  naturalWidth = 200;
  naturalHeight = 100;
  complete = false;

  constructor() {
    // Fire onload after a microtick so constructor can assign onload first
    Promise.resolve().then(() => {
      this.complete = true;
      if (this.onload) this.onload();
    });
  }
});
