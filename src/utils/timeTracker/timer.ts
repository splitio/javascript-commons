export function timer(now: () => number) {
  const st = now();

  return function stop() {
    return Math.round(now() - st);
  };
}
