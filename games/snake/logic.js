export const size = 20;
export const vectors = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const same = (a, b) => a.x === b.x && a.y === b.y;

export function chooseFood(body, random = Math.random) {
  const empty = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!body.some(segment => segment.x === x && segment.y === y)) empty.push({ x, y });
    }
  }
  return empty.length ? empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))] : null;
}

export function newSnake(random = Math.random) {
  const body = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
  return { body, direction: 'right', queue: [], food: chooseFood(body, random), score: 0, over: false, won: false };
}

export function turn(state, direction) {
  if (!vectors[direction] || state.queue.length >= 2) return;
  const previous = vectors[state.queue.at(-1) || state.direction];
  const next = vectors[direction];
  if (previous.x + next.x === 0 && previous.y + next.y === 0) return;
  if (previous.x === next.x && previous.y === next.y) return;
  state.queue.push(direction);
}

export function tick(state, random = Math.random) {
  if (state.over || state.won) return;
  state.direction = state.queue.shift() || state.direction;
  const direction = vectors[state.direction];
  const head = { x: state.body[0].x + direction.x, y: state.body[0].y + direction.y };
  const eating = state.food && same(head, state.food);
  const collisionBody = eating ? state.body : state.body.slice(0, -1);
  if (head.x < 0 || head.x >= size || head.y < 0 || head.y >= size || collisionBody.some(segment => same(segment, head))) {
    state.over = true;
    return;
  }
  state.body.unshift(head);
  if (eating) {
    state.score += 10;
    state.food = chooseFood(state.body, random);
    state.won = !state.food;
  } else {
    state.body.pop();
  }
}
