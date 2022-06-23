/**
 * Searches the index of the specified `value` inside an ordered array of `items` using the binary search algorithm.
 *
 * @param items the array to be searched
 * @param value the value to be searched for
 * @returns integer number between 0 and `items.length`. This value is the index of the search value,
 * if it is contained in the array, or the index at which the value should be inserted to keep the array ordered.
 */
export function binarySearch(items: number[], value: number): number {
  let startIndex = 0;
  let stopIndex = items.length - 1;
  let middle = Math.floor((stopIndex + startIndex) / 2);
  let minIndex = startIndex;
  let maxIndex = stopIndex;

  while (items[middle] !== value && startIndex < stopIndex) {
    // adjust search area
    if (value < items[middle]) {
      stopIndex = middle - 1;
    } else if (value > items[middle]) {
      startIndex = middle + 1;
    }

    // recalculate middle
    middle = Math.floor((stopIndex + startIndex) / 2);
  }

  // correct if middle is out of range
  if (middle < minIndex) {
    middle = minIndex;
  } else if (middle > maxIndex) {
    middle = maxIndex;
  }

  // we want to always return based on strict minor comparation
  if (value < items[middle] && middle > minIndex) {
    return middle - 1;
  }

  return middle;
}
