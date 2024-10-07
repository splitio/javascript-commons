export function returnSetsUnion<T>(set: Set<T>, set2: Set<T>): Set<T> {
  const result = new Set(Array.from(set));
  set2.forEach(value => {
    result.add(value);
  });
  return result;
}

export function returnDifference<T>(list: T[] = [], list2: T[] = []): T[] {
  const result = new Set(list);
  list2.forEach(item => {
    result.delete(item);
  });
  return Array.from(result);
}
