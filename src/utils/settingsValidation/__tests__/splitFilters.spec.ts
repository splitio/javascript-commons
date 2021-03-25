import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { STANDALONE_MODE, CONSUMER_MODE } from '../../constants';

// Split filter and QueryStrings examples
import { splitFilters, queryStrings, groupedFilters } from '../../../__tests__/mocks/fetchSpecificSplits';

// Test target
import { validateSplitFilters } from '../splitFilters';
import { SETTINGS_SPLITS_FILTER, ERROR_INVALID, ERROR_EMPTY_ARRAY, WARN_SPLITS_FILTER_IGNORED, WARN_SPLITS_FILTER_INVALID, WARN_SPLITS_FILTER_EMPTY } from '../../../logger/constants';

describe('validateSplitFilters', () => {

  let defaultOutput = {
    validFilters: [],
    queryString: null,
    groupedFilters: { byName: [], byPrefix: [] }
  };

  afterEach(() => { loggerMock.mockClear(); });

  test('Returns default output with empty values if `splitFilters` is an invalid object or `mode` is not \'standalone\'', () => {

    expect(validateSplitFilters(loggerMock, undefined, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(loggerMock, null, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(loggerMock.warn).not.toBeCalled();

    expect(validateSplitFilters(loggerMock, true, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(loggerMock, 15, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(loggerMock, 'string', STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(loggerMock, [], STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(loggerMock, [{ type: 'byName', values: ['split_1'] }], CONSUMER_MODE)).toEqual(defaultOutput); // splitFilters ignored if not in 'standalone' mode
    expect(loggerMock.warn.mock.calls).toEqual([[WARN_SPLITS_FILTER_EMPTY], [WARN_SPLITS_FILTER_EMPTY], [WARN_SPLITS_FILTER_EMPTY], [WARN_SPLITS_FILTER_EMPTY], [WARN_SPLITS_FILTER_IGNORED, ['standalone']]]);

    expect(loggerMock.debug).not.toBeCalled();
    expect(loggerMock.error).not.toBeCalled();
  });

  test('Returns object with null queryString, if `splitFilters` contains invalid filters or contains filters with no values or invalid values', () => {

    let splitFilters: any[] = [
      { type: 'byName', values: [] },
      { type: 'byName', values: [] },
      { type: 'byPrefix', values: [] }];
    let output = {
      validFilters: [...splitFilters],
      queryString: null,
      groupedFilters: { byName: [], byPrefix: [] }
    };
    expect(validateSplitFilters(loggerMock, splitFilters, STANDALONE_MODE)).toEqual(output); // filters without values
    expect(loggerMock.debug).toBeCalledWith(SETTINGS_SPLITS_FILTER, [null]);
    loggerMock.debug.mockClear();

    splitFilters.push(
      { type: 'invalid', values: [] },
      { type: 'byName', values: 'invalid' },
      { type: null, values: [] },
      { type: 'byName', values: [13] });
    output.validFilters.push({ type: 'byName', values: [13] });
    expect(validateSplitFilters(loggerMock, splitFilters, STANDALONE_MODE)).toEqual(output); // some filters are invalid
    expect(loggerMock.debug.mock.calls).toEqual([[SETTINGS_SPLITS_FILTER, [null]]]);
    expect(loggerMock.warn.mock.calls).toEqual([
      [WARN_SPLITS_FILTER_INVALID, [3]], // invalid value of `type` property
      [WARN_SPLITS_FILTER_INVALID, [4]], // invalid type of `values` property
      [WARN_SPLITS_FILTER_INVALID, [5]] // invalid type of `type` property
    ]);

    expect(loggerMock.error.mock.calls).toEqual([
      [ERROR_INVALID, ['settings', 'byName filter value']],
      [ERROR_EMPTY_ARRAY, ['settings', 'byName filter']]
    ]);
  });

  test('Returns object with a queryString, if `splitFilters` contains at least a valid `byName` or `byPrefix` filter with at least a valid value', () => {

    for (let i = 0; i < splitFilters.length; i++) {

      if (groupedFilters[i]) { // tests where validateSplitFilters executes normally
        const output = {
          validFilters: [...splitFilters[i]],
          queryString: queryStrings[i],
          groupedFilters: groupedFilters[i]
        };
        expect(validateSplitFilters(loggerMock, splitFilters[i], STANDALONE_MODE)).toEqual(output); // splitFilters #${i}
        expect(loggerMock.debug).lastCalledWith(SETTINGS_SPLITS_FILTER, [queryStrings[i]]);

      } else { // tests where validateSplitFilters throws an exception
        expect(() => validateSplitFilters(loggerMock, splitFilters[i], STANDALONE_MODE)).toThrow(queryStrings[i]);
      }
    }
  });

});
