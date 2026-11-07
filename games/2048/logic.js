export function moveBoard(board, direction) {
  const result = Array(16).fill(0);
  let points = 0;
  for (let line = 0; line < 4; line++) {
    const indices = [];
    for (let offset = 0; offset < 4; offset++) {
      const step = direction === 'right' || direction === 'down' ? 3 - offset : offset;
      indices.push(direction === 'left' || direction === 'right' ? line * 4 + step : step * 4 + line);
    }
    const values = indices.map(index => board[index]).filter(Boolean);
    const merged = [];
    for (let index = 0; index < values.length; index++) {
      if (values[index] === values[index + 1]) {
        const value = values[index] * 2;
        merged.push(value);
        points += value;
        index++;
      } else {
        merged.push(values[index]);
      }
    }
    indices.forEach((index, offset) => { result[index] = merged[offset] || 0; });
  }
  return { board: result, points, moved: result.some((value, index) => value !== board[index]) };
}

export function spawnTile(board, random = Math.random) {
  const empty = board.map((value, index) => value === 0 ? index : -1).filter(index => index >= 0);
  if (!empty.length) return -1;
  const index = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  board[index] = random() < .9 ? 2 : 4;
  return index;
}

export function canMove(board) {
  return board.includes(0) || ['left', 'up'].some(direction => moveBoard(board, direction).moved);
}

export function validSave(saved) {
  return saved && Array.isArray(saved.board) && saved.board.length === 16 && saved.board.some(Boolean)
    && saved.board.every(value => Number.isSafeInteger(value) && value >= 0 && (value === 0 || (value >= 2 && Number.isInteger(Math.log2(value)))))
    && Number.isSafeInteger(saved.score) && saved.score >= 0;
}
