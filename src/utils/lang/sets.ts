export function returnSetsUnion<T>(set: Set<T>, set2: Set<T>): Set<T> {
  return new Set(Array.from(set).concat(Array.from(set2)));
}

export function returnDifference<T>(list: T[] = [], list2: T[] = []): T[] {
  return list.filter(item => list2.indexOf(item) === -1);
}
