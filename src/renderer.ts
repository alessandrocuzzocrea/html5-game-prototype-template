export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

export class Renderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  clear(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawImage(
    image: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    tint: string | null,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);

    if (tint) {
      // Draw the image offscreen, tint it via globalCompositeOperation
      ctx.globalAlpha = 0.9;
    }

    ctx.drawImage(image, -w / 2, -h / 2, w, h);

    if (tint) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = tint;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    ctx.restore();
  }

  drawHello(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hello World', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  drawHitMarker(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
