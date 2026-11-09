// Presentation only: game state, rules and saved progress stay in each game.
export function decoratePuzzle(ui, theme) {
  const shell = document.querySelector('.game-shell');
  const panel = document.createElement('aside');
  panel.className = 'puzzle-panel';
  panel.setAttribute('aria-label', '游戏操作与进度');
  shell.prepend(panel);
  for (const selector of ['.game-header', '.toolbar', '.puzzle-settings', '.touch-controls', '.puzzle-note', '.help', '.storage-note']) {
    const node = shell.querySelector(selector);
    if (node) panel.append(node);
  }
  const portrait = document.createElement('span');
  portrait.className = `panel-portrait art-sprite ${theme === 'minesweeper' ? 'sprite-mine' : 'sprite-worker'}`;
  portrait.setAttribute('aria-hidden', 'true');
  panel.querySelector('.game-header').append(portrait);
  const sparkle = document.createElement('div');
  sparkle.className = 'board-sparkles';
  sparkle.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 12; i++) {
    const star = document.createElement('i');
    star.style.setProperty('--i', i);
    sparkle.append(star);
  }
  ui.arena.append(sparkle);
  return {
    celebrate() {
      sparkle.classList.remove('celebrate');
      void sparkle.offsetWidth;
      sparkle.classList.add('celebrate');
    }
  };
}

export function animateMove(board, before, after) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cell = board.children[after.player];
  const worker = cell?.querySelector('.worker');
  // Use grid geometry, so animation also follows responsive cell sizes.
  const rect = cell?.getBoundingClientRect();
  const previous = board.children[before.player]?.getBoundingClientRect();
  if (worker && rect && previous) worker.animate([
    { transform: `translate(${previous.x - rect.x}px, ${previous.y - rect.y}px)` },
    { transform: 'translate(0, -3px)', offset: .7 },
    { transform: 'translate(0, 0)' }
  ], { duration: 150, easing: 'ease-out' });
  if (after.pushed) {
    const index = after.boxes.find(i => !before.boxes.includes(i));
    const old = before.boxes.find(i => !after.boxes.includes(i));
    const crate = board.children[index]?.querySelector('.crate');
    if (crate && Number.isInteger(old)) {
      const from = board.children[old].getBoundingClientRect();
      const to = board.children[index].getBoundingClientRect();
      crate.animate([
        { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px)` },
        { transform: 'translate(0,0)' }
      ], { duration: 145, easing: 'ease-out' });
    }
  }
}
