export function now() {
  // eslint-disable-next-line no-undef
  let time = process.hrtime();

  return time[0] * 1e3 + time[1] * 1e-6; // convert it to millis
}
