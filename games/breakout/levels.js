export const levelCount = 50;

export function validCheckpoint(saved) {
  return saved?.version === 1 && Number.isInteger(saved.level) && saved.level >= 1 && saved.level <= levelCount
    && Number.isSafeInteger(saved.score) && saved.score >= 0;
}

export function levelSettings(level) {
  const number = Math.min(levelCount, Math.max(1, Math.trunc(Number(level)) || 1));
  return {
    number,
    rows: 6 + Math.floor((number - 1) / 10),
    ballSpeed: 270 + (number - 1) * 3,
    paddleWidth: 104 - Math.floor((number - 1) * .8),
    maxHits: Math.min(3, 1 + Math.floor((number - 1) / 15))
  };
}
