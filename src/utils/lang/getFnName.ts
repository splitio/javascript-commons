/**
 * Returns the name of a given function.
 */
export function getFnName(fn: any): string {
  if (fn.name) return fn.name;

  return (fn.toString().match(/function (.+?)\(/) || ['', ''])[1];
}
