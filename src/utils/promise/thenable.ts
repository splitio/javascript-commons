// returns true if the given value is a thenable object
export default (o: any): o is Promise<any> => o !== undefined && o !== null && typeof o.then === 'function';
