// returns true if the given value is a thenable object
export function thenable(o: any): o is Promise<any> {
  return o !== undefined && o !== null && typeof o.then === 'function';
}
