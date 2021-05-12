import { ISplit } from '../../dtos/types';
import { _parseSegments, getRegisteredSegments } from '../getRegisteredSegments';
import { parsedSplitWithSegments } from './testUtils';

test('_parseSegments', () => {
  const segments = _parseSegments(parsedSplitWithSegments as ISplit);

  expect(segments.has('A')).toBe(true);
  expect(segments.has('B')).toBe(true);
});

test('getRegisteredSegments', () => {

  const split = JSON.stringify(parsedSplitWithSegments);
  const segments = getRegisteredSegments([split, split, split]);

  expect(segments).toEqual(['A', 'B']);
});
