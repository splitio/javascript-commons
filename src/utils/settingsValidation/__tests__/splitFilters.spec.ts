import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { STANDALONE_MODE, CONSUMER_MODE } from '../../constants';

// Split filter and QueryStrings examples
import { splitFilters, queryStrings, groupedFilters, flagSetValidFilters } from '../../../__tests__/mocks/fetchSpecificSplits';

// Test target
import { validateSplitFilters } from '../splitFilters';
import { SETTINGS_SPLITS_FILTER, ERROR_INVALID, ERROR_EMPTY_ARRAY, WARN_SPLITS_FILTER_IGNORED, WARN_SPLITS_FILTER_INVALID, WARN_SPLITS_FILTER_EMPTY, WARN_TRIMMING, WARN_SPLITS_FILTER_NAME_AND_SET, WARN_SPLITS_FILTER_INVALID_SET, WARN_SPLITS_FILTER_LOWERCASE_SET } from '../../../logger/constants';

describe('validateSplitFilters', () => {

  const defaultOutput = {
    validFilters: [],
    queryString: null,
    groupedFilters: { bySet: [], byName: [], byPrefix: [] }
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

    const splitFilters: any[] = [
      { type: 'bySet', values: [] },
      { type: 'byName', values: [] },
      { type: 'byName', values: [] },
      { type: 'byPrefix', values: [] }];
    const output = {
      validFilters: [...splitFilters],
      queryString: null,
      groupedFilters: { bySet: [], byName: [], byPrefix: [] }
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
      [WARN_SPLITS_FILTER_INVALID, [4]], // invalid value of `type` property
      [WARN_SPLITS_FILTER_INVALID, [5]], // invalid type of `values` property
      [WARN_SPLITS_FILTER_INVALID, [6]] // invalid type of `type` property
    ]);

    expect(loggerMock.error.mock.calls).toEqual([
      [ERROR_INVALID, ['settings', 'byName filter value']],
      [ERROR_EMPTY_ARRAY, ['settings', 'byName filter']]
    ]);
  });

  test('Returns object with a queryString, if `splitFilters` contains at least a valid `byName` or `byPrefix` filter with at least a valid value', () => {

    for (let i = 0; i < 6; i++) {

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


describe('validateSetFilter', () => {

  const getOutput = (testIndex: number) => {
    return {
      // @ts-ignore
      validFilters: [...flagSetValidFilters[testIndex]],
      queryString: queryStrings[testIndex],
      groupedFilters: groupedFilters[testIndex]
    };
  };

  const regexp = /^[a-z][_a-z0-9]{0,49}$/;

  test('Config validations', () => {
    // extra spaces trimmed and sorted query output
    expect(validateSplitFilters(loggerMock, splitFilters[6], STANDALONE_MODE)).toEqual(getOutput(6)); // trim & sort
    expect(loggerMock.warn.mock.calls[0]).toEqual([WARN_TRIMMING, ['settings', 'bySet filter value', ' set_1']]);
    expect(loggerMock.warn.mock.calls[1]).toEqual([WARN_TRIMMING, ['settings', 'bySet filter value', 'set_3 ']]);
    expect(loggerMock.warn.mock.calls[2]).toEqual([WARN_TRIMMING, ['settings', 'bySet filter value', ' set_a ']]);
    expect(loggerMock.warn.mock.calls[3]).toEqual([WARN_SPLITS_FILTER_NAME_AND_SET]);

    expect(validateSplitFilters(loggerMock, splitFilters[7], STANDALONE_MODE)).toEqual(getOutput(7)); // lowercase and regexp
    expect(loggerMock.warn.mock.calls[4]).toEqual([WARN_SPLITS_FILTER_LOWERCASE_SET, ['seT_c']]); // lowercase
    expect(loggerMock.warn.mock.calls[5]).toEqual([WARN_SPLITS_FILTER_LOWERCASE_SET, ['set_B']]); // lowercase
    expect(loggerMock.warn.mock.calls[6]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set_ 1', regexp, 'set_ 1']]); // empty spaces
    expect(loggerMock.warn.mock.calls[7]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set _3', regexp, 'set _3']]); // empty spaces
    expect(loggerMock.warn.mock.calls[8]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['3set_a', regexp, '3set_a']]); // start with a letter
    expect(loggerMock.warn.mock.calls[9]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['_set_2', regexp, '_set_2']]); // start with a letter
    expect(loggerMock.warn.mock.calls[10]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set_1234567890_1234567890_234567890_1234567890_1234567890', regexp, 'set_1234567890_1234567890_234567890_1234567890_1234567890']]); // max of 50 characters
    expect(loggerMock.warn.mock.calls[11]).toEqual([WARN_SPLITS_FILTER_NAME_AND_SET]);

    expect(validateSplitFilters(loggerMock, splitFilters[8], STANDALONE_MODE)).toEqual(getOutput(8)); // lowercase and dedupe
    expect(loggerMock.warn.mock.calls[12]).toEqual([WARN_SPLITS_FILTER_LOWERCASE_SET, ['SET_2']]); // lowercase
    expect(loggerMock.warn.mock.calls[13]).toEqual([WARN_SPLITS_FILTER_LOWERCASE_SET, ['set_B']]); // lowercase
    expect(loggerMock.warn.mock.calls[14]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set_3!', regexp, 'set_3!']]); // special character
    expect(loggerMock.warn.mock.calls[15]).toEqual([WARN_SPLITS_FILTER_NAME_AND_SET]);

    expect(loggerMock.warn.mock.calls.length).toEqual(16);
  });
});
