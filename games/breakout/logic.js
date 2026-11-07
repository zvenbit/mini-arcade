import { levelSettings, levelCount } from './levels.js';
export { levelCount };
export const width = 480;
export const height = 480;
export const paddleY = 437;
export const radius = 7;
export const rowStep = 20;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const visibleBrick = brick => brick.active && brick.y >= 0;

export function createLevel(level = 1, score = 0, lives = 3) {
  const settings = levelSettings(level);
  const bricks = [];
  for (let row = 0; row < settings.rows; row++) {
    for (let col = 0; col < 8; col++) {
      const hp = 1 + ((row + col * 3) % settings.maxHits);
      const y = 24 + row * rowStep;
      bricks.push({ x: 20 + col * 55, y, fromY: y, width: 50, height: 14, row, hp, maxHp: hp, active: true });
    }
  }
  return { level: settings.number, score, lives, bricks, paddle: 240,
    paddleWidth: settings.paddleWidth, speed: settings.ballSpeed, totalRows: settings.rows,
    clearedRows: 0, collapsedRows: new Set(), collapseRemaining: 0,
    ball: { x: 240, y: paddleY - radius - 1, vx: 0, vy: 0 }, mode: 'serve' };
}

export function launchBall(state) {
  if (state.mode !== 'serve') return;
  state.ball.vx = state.speed * .42;
  state.ball.vy = -state.speed * Math.sqrt(1 - .42 ** 2);
  state.mode = 'running';
}

export function movePaddle(state, x) {
  state.paddle = clamp(x, state.paddleWidth / 2, width - state.paddleWidth / 2);
  if (state.mode === 'serve') state.ball.x = state.paddle;
}

function clearRow(state, row, onSound) {
  if (state.collapsedRows.has(row) || state.bricks.some(brick => brick.row === row && brick.active)) return;
  state.collapsedRows.add(row);
  state.clearedRows++;
  let moved = false;
  for (const brick of state.bricks) {
    brick.fromY = brick.y;
    if (brick.active) { brick.y += rowStep; moved = true; }
  }
  // Freeze the ball while rows slide, then release it if a row overlaps it.
  state.collapseRemaining = moved ? .22 : 0;
  onSound('merge');
}

export function update(state, dt, onSound = () => {}) {
  if (state.mode !== 'running') return;
  if (state.collapseRemaining > 0) {
    state.collapseRemaining = Math.max(0, state.collapseRemaining - Math.min(dt, .05));
    if (state.collapseRemaining === 0 && state.bricks.some(brick => brick.active
      && (state.ball.x - clamp(state.ball.x, brick.x, brick.x + brick.width)) ** 2
      + (state.ball.y - clamp(state.ball.y, brick.y, brick.y + brick.height)) ** 2 < radius ** 2)) {
      state.ball.y = Math.max(...state.bricks.filter(brick => brick.active).map(brick => brick.y + brick.height)) + radius + 1;
      state.ball.vy = Math.abs(state.ball.vy);
    }
    return;
  }
  let remaining = Math.min(dt, .05);
  while (remaining > 0 && state.mode === 'running' && state.collapseRemaining === 0) {
    const step = Math.min(remaining, 1 / 240);
    remaining -= step;
    const ball = state.ball;
    const previousY = ball.y;
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;
    if (ball.x < radius) { ball.x = radius; ball.vx = Math.abs(ball.vx); onSound('bounce'); }
    if (ball.x > width - radius) { ball.x = width - radius; ball.vx = -Math.abs(ball.vx); onSound('bounce'); }
    if (ball.y < radius) { ball.y = radius; ball.vy = Math.abs(ball.vy); onSound('bounce'); }
    if (ball.vy > 0 && previousY + radius <= paddleY && ball.y + radius >= paddleY
      && ball.x >= state.paddle - state.paddleWidth / 2 - radius && ball.x <= state.paddle + state.paddleWidth / 2 + radius) {
      const offset = clamp((ball.x - state.paddle) / (state.paddleWidth / 2), -1, 1);
      const angle = offset * Math.PI / 3;
      const speed = Math.min(state.speed + 45, Math.hypot(ball.vx, ball.vy) + 2);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
      ball.y = paddleY - radius;
      onSound('bounce');
    }
    for (const brick of state.bricks) {
      if (!visibleBrick(brick)) continue;
      const nearestX = clamp(ball.x, brick.x, brick.x + brick.width);
      const nearestY = clamp(ball.y, brick.y, brick.y + brick.height);
      if ((ball.x - nearestX) ** 2 + (ball.y - nearestY) ** 2 > radius ** 2) continue;
      brick.hp--;
      brick.active = brick.hp > 0;
      if (!brick.active) state.score += 10 * brick.maxHp;
      onSound(brick.active ? 'bounce' : 'brick');
      if (previousY <= brick.y) { ball.vy = -Math.abs(ball.vy); ball.y = brick.y - radius; }
      else if (previousY >= brick.y + brick.height) { ball.vy = Math.abs(ball.vy); ball.y = brick.y + brick.height + radius; }
      else if (ball.x < brick.x + brick.width / 2) { ball.vx = -Math.abs(ball.vx); ball.x = brick.x - radius; }
      else { ball.vx = Math.abs(ball.vx); ball.x = brick.x + brick.width + radius; }
      if (!brick.active) clearRow(state, brick.row, onSound);
      if (state.bricks.every(item => !item.active)) state.mode = state.level === levelCount ? 'won' : 'cleared';
      break;
    }
    if (ball.y - radius > height) {
      state.lives--;
      state.mode = state.lives > 0 ? 'serve' : 'over';
      state.ball = { x: state.paddle, y: paddleY - radius - 1, vx: 0, vy: 0 };
    }
  }
}
