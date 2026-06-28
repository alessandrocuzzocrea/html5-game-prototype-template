import { Game } from './game.js';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #gameCanvas not found');

const game = new Game(canvas);

// Track held rotation keys so releasing one doesn't cancel the other
const held = new Set<string>();

function updateAimInput(): void {
  const left = held.has('a') || held.has('ArrowLeft');
  const right = held.has('d') || held.has('ArrowRight');
  if (left && !right) game.setAimInput(-1);
  else if (right && !left) game.setAimInput(1);
  else game.setAimInput(0);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'a' || e.key === 'ArrowLeft' || e.key === 'd' || e.key === 'ArrowRight') {
    held.add(e.key);
    updateAimInput();
  } else if (e.key === ' ') {
    e.preventDefault();
    game.spacePressed();
  } else if (e.key === 'q') {
    game.debugWin();
  } else if (e.key === 'w') {
    game.debugKillPlayer();
  } else if (e.key === 'Enter') {
    game.retry();
  }
});

window.addEventListener('keyup', (e) => {
  held.delete(e.key);
  updateAimInput();
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  game.handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

function loop(timestamp: number): void {
  game.update(timestamp);
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
