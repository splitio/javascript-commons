import { segmentTransform } from '../segment';

test('TRANSFORMS / a segment object should be flatten to a string', function () {
  const segmentName = 'employees';
  const sample = {
    segmentName
  };

  const plainSegmentName = segmentTransform(sample);

  expect(segmentName).toBe(plainSegmentName); // extracted segmentName matches
});

test('TRANSFORMS / if there is none segmentName entry, returns undefined', function () {
  const sample = undefined;
  const undefinedSegmentName = segmentTransform(sample);

  expect(undefinedSegmentName).toBe(undefined); // expected to be undefined
});
