import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

// Import the module mocking the logger.
import { validatePreloadedData } from '../preloadedData';

const method = 'some_method';
const testCases = [
  // valid inputs
  {
    input: { lastUpdated: 10, since: 10, splitsData: {} },
    output: true,
    warn: `${method}: preloadedData.splitsData doesn't contain split definitions.`
  },
  {
    input: { lastUpdated: 10, since: 10, splitsData: { 'some_split': 'SPLIT DEFINITION' } },
    output: true
  },
  {
    input: { lastUpdated: 10, since: 10, splitsData: { 'some_split': 'SPLIT DEFINITION' }, mySegmentsData: { 'some_key': [] } },
    output: true
  },
  {
    input: { lastUpdated: 10, since: 10, splitsData: { 'some_split': 'SPLIT DEFINITION' }, mySegmentsData: { 'some_key': [] } },
    output: true
  },
  {
    input: { lastUpdated: 10, since: 10, splitsData: { 'some_split': 'SPLIT DEFINITION' }, mySegmentsData: {} },
    output: true
  },
  {
    input: { lastUpdated: 10, since: 10, splitsData: { 'some_split': 'SPLIT DEFINITION' }, mySegmentsData: { some_key: [] } },
    output: true
  },
  {
    input: { lastUpdated: 10, since: 10, splitsData: { 'some_split': 'SPLIT DEFINITION' }, mySegmentsData: { some_key: ['some_segment'] } },
    output: true
  },
  {
    input: { lastUpdated: 10, since: 10, splitsData: { 'some_split': 'SPLIT DEFINITION' }, segmentsData: {} },
    output: true
  },
  {
    input: { lastUpdated: 10, since: 10, splitsData: { 'some_split': 'SPLIT DEFINITION' }, segmentsData: { some_segment: 'SEGMENT DEFINITION' } },
    output: true
  },
  {
    input: { lastUpdated: 10, since: 10, splitsData: { 'some_split': 'SPLIT DEFINITION' }, mySegmentsData: { some_key: ['some_segment'], some_other_key: ['some_segment'] }, segmentsData: { some_segment: 'SEGMENT DEFINITION', some_other_segment: 'SEGMENT DEFINITION' } },
    output: true
  },
  {
    // should be true, even using objects for strings and numbers or having extra properties
    input: { ignoredProperty: 'IGNORED', lastUpdated: new Number(10), since: new Number(10), splitsData: { 'some_split': new String('SPLIT DEFINITION') }, mySegmentsData: { some_key: [new String('some_segment')] }, segmentsData: { some_segment: new String('SEGMENT DEFINITION') } },
    output: true
  },

  // invalid inputs
  {
    // should be false if preloadedData is not an object
    input: undefined,
    output: false,
    error: `${method}: preloadedData must be an object.`
  },
  {
    // should be false if preloadedData is not an object
    input: [],
    output: false,
    error: `${method}: preloadedData must be an object.`
  },
  {
    // should be false if lastUpdated property is invalid
    input: { lastUpdated: undefined, since: 10, splitsData: {} },
    output: false,
    error: `${method}: preloadedData.lastUpdated must be a positive number.`
  },
  {
    // should be false if lastUpdated property is invalid
    input: { lastUpdated: -1, since: 10, splitsData: {} },
    output: false,
    error: `${method}: preloadedData.lastUpdated must be a positive number.`
  },
  {
    // should be false if since property is invalid
    input: { lastUpdated: 10, since: undefined, splitsData: {} },
    output: false,
    error: `${method}: preloadedData.since must be a positive number.`
  },
  {
    // should be false if since property is invalid
    input: { lastUpdated: 10, since: -1, splitsData: {} },
    output: false,
    error: `${method}: preloadedData.since must be a positive number.`
  },
  {
    // should be false if splitsData property is invalid
    input: { lastUpdated: 10, since: 10, splitsData: undefined },
    output: false,
    error: `${method}: preloadedData.splitsData must be a map of split names to their serialized definitions.`
  },
  {
    // should be false if splitsData property is invalid
    input: { lastUpdated: 10, since: 10, splitsData: ['DEFINITION'] },
    output: false,
    error: `${method}: preloadedData.splitsData must be a map of split names to their serialized definitions.`
  },
  {
    // should be false if splitsData property is invalid
    input: { lastUpdated: 10, since: 10, splitsData: { some_split: undefined } },
    output: false,
    error: `${method}: preloadedData.splitsData must be a map of split names to their serialized definitions.`
  },
  {
    // should be false if mySegmentsData property is invalid
    input: { lastUpdated: 10, since: 10, splitsData: { some_split: 'DEFINITION' }, mySegmentsData: ['DEFINITION'] },
    output: false,
    error: `${method}: preloadedData.mySegmentsData must be a map of user keys to their list of segment names.`
  },
  {
    // should be false if mySegmentsData property is invalid
    input: { lastUpdated: 10, since: 10, splitsData: { some_split: 'DEFINITION' }, mySegmentsData: { some_key: undefined } },
    output: false,
    error: `${method}: preloadedData.mySegmentsData must be a map of user keys to their list of segment names.`
  },
  {
    // should be false if segmentsData property is invalid
    input: { lastUpdated: 10, since: 10, splitsData: { some_split: 'DEFINITION' }, segmentsData: ['DEFINITION'] },
    output: false,
    error: `${method}: preloadedData.segmentsData must be a map of segment names to their serialized definitions.`
  },
  {
    // should be false if segmentsData property is invalid
    input: { lastUpdated: 10, since: 10, splitsData: { some_split: 'DEFINITION' }, segmentsData: { some_segment: undefined } },
    output: false,
    error: `${method}: preloadedData.segmentsData must be a map of segment names to their serialized definitions.`
  }
];

test('INPUT VALIDATION for preloadedData', () => {

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    expect(validatePreloadedData(loggerMock, testCase.input, method)).toBe(testCase.output);

    if (testCase.error) {
      expect(loggerMock.error.mock.calls[0]).toEqual([testCase.error]); // Should log the error for the invalid preloadedData.
      loggerMock.error.mockClear();
    } else {
      expect(loggerMock.error).not.toBeCalled(); // Should not log any error.
    }

    if (testCase.warn) {
      expect(loggerMock.warn.mock.calls[0]).toEqual([testCase.warn]); // Should log the warning for the given preloadedData.
      loggerMock.warn.mockClear();
    } else {
      expect(loggerMock.warn).not.toBeCalled(); // Should not log any warning.
    }
  }
});
