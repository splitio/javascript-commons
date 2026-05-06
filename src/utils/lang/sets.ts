export function setToArray<T>(set: Set<T>): T[] {
  if (Array.from) return Array.from(set);

  const array: T[] = [];
  set.forEach((value: T) => {
    array.push(value);
  });
  return array;
}

export function returnSetsUnion<T>(set: Set<T>, set2: Set<T>): Set<T> {
  return new Set(setToArray(set).concat(setToArray(set2)));
}

export function returnDifference<T>(list1?: T[] | null, list2?: T[] | null): T[] {
  list1 = list1 || [];
  list2 = list2 || [];
  return list1.filter(item => list2!.indexOf(item) === -1);
}
