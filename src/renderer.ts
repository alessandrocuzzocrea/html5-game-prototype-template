export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

export class Renderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  clear(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawHello(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hello World', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }
}
