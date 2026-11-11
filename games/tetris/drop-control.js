// A double tap accelerates only the current piece. Key repeats never count as taps.
export function createDropControl() {
  let lastTap = -Infinity;
  let fast = false;
  return {
    get fast() { return fast; },
    tap(now) {
      if (now - lastTap >= 0 && now - lastTap <= 280) fast = true;
      lastTap = now;
      return fast;
    },
    reset() { lastTap = -Infinity; fast = false; }
  };
}
