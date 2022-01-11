export function timer(now?: () => number) {
  const st = now ? now() : Date.now();

  return function stop() {
    return Math.round(now ? now() : Date.now() - st);
  };
}
