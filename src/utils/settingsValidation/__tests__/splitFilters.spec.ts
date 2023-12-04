import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { STANDALONE_MODE, CONSUMER_MODE, CONSUMER_PARTIAL_MODE, LOCALHOST_MODE, PRODUCER_MODE } from '../../constants';

// Split filter and QueryStrings examples
import { splitFilters, queryStrings, groupedFilters } from '../../../__tests__/mocks/fetchSpecificSplits';

// Test target
import { validateFlagSets, validateSplitFilters } from '../splitFilters';
import { SETTINGS_SPLITS_FILTER, ERROR_INVALID, ERROR_EMPTY_ARRAY, ERROR_SETS_FILTER_EXCLUSIVE, WARN_SPLITS_FILTER_INVALID, WARN_SPLITS_FILTER_EMPTY, WARN_TRIMMING, WARN_SPLITS_FILTER_INVALID_SET, WARN_SPLITS_FILTER_LOWERCASE_SET, WARN_FLAGSET_NOT_CONFIGURED, WARN_SPLITS_FILTER_IGNORED } from '../../../logger/constants';

describe('validateSplitFilters', () => {

  const defaultOutput = {
    validFilters: [],
    queryString: null,
    groupedFilters: { bySet: [], byName: [], byPrefix: [] },
  };

  const getOutput = (testIndex: number) => {
    return {
      // @ts-ignore
      validFilters: splitFilters[testIndex],
      queryString: queryStrings[testIndex],
      groupedFilters: groupedFilters[testIndex],
    };
  };

  const regexp = /^[a-z0-9][_a-z0-9]{0,49}$/;

  afterEach(() => { loggerMock.mockClear(); });

  test('Returns default output with empty values if `splitFilters` is an invalid object or `mode` is \'consumer\' or \'consumer_partial\'', () => {

    expect(validateSplitFilters(loggerMock, undefined, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(loggerMock, null, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(loggerMock.warn).not.toBeCalled();

    expect(validateSplitFilters(loggerMock, true, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(loggerMock, 15, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(loggerMock, 'string', STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(loggerMock, [], STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array

    expect(validateSplitFilters(loggerMock, [{ type: 'byName', values: ['split_1'] }], CONSUMER_MODE)).toEqual(defaultOutput); // splitFilters ignored if in consumer mode
    expect(validateSplitFilters(loggerMock, [{ type: 'byName', values: ['split_1'] }], CONSUMER_PARTIAL_MODE)).toEqual(defaultOutput); // splitFilters ignored if in partial consumer mode

    expect(loggerMock.warn.mock.calls).toEqual([[WARN_SPLITS_FILTER_EMPTY], [WARN_SPLITS_FILTER_EMPTY], [WARN_SPLITS_FILTER_EMPTY], [WARN_SPLITS_FILTER_EMPTY], [WARN_SPLITS_FILTER_IGNORED], [WARN_SPLITS_FILTER_IGNORED]]);

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
      groupedFilters: { bySet: [], byName: [], byPrefix: [] },
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
          groupedFilters: groupedFilters[i],
        };
        expect(validateSplitFilters(loggerMock, splitFilters[i], STANDALONE_MODE)).toEqual(output); // splitFilters #${i}
        expect(loggerMock.debug).lastCalledWith(SETTINGS_SPLITS_FILTER, [queryStrings[i]]);

      } else { // tests where validateSplitFilters throws an exception
        expect(() => validateSplitFilters(loggerMock, splitFilters[i], STANDALONE_MODE)).toThrow(queryStrings[i]);
      }
    }
  });

  test('Validates flag set filters', () => {
    // extra spaces trimmed and sorted query output
    expect(validateSplitFilters(loggerMock, splitFilters[6], STANDALONE_MODE)).toEqual(getOutput(6)); // trim & sort
    expect(loggerMock.warn.mock.calls[0]).toEqual([WARN_TRIMMING, ['settings', 'bySet filter value', ' set_1']]);
    expect(loggerMock.warn.mock.calls[1]).toEqual([WARN_TRIMMING, ['settings', 'bySet filter value', 'set_3 ']]);
    expect(loggerMock.warn.mock.calls[2]).toEqual([WARN_TRIMMING, ['settings', 'bySet filter value', ' set_a ']]);
    expect(loggerMock.error.mock.calls[0]).toEqual([ERROR_SETS_FILTER_EXCLUSIVE]);

    expect(validateSplitFilters(loggerMock, splitFilters[7], LOCALHOST_MODE)).toEqual(getOutput(7)); // lowercase and regexp
    expect(loggerMock.warn.mock.calls[3]).toEqual([WARN_SPLITS_FILTER_LOWERCASE_SET, ['seT_c']]); // lowercase
    expect(loggerMock.warn.mock.calls[4]).toEqual([WARN_SPLITS_FILTER_LOWERCASE_SET, ['set_B']]); // lowercase
    expect(loggerMock.warn.mock.calls[5]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set_ 1', regexp, 'set_ 1']]); // empty spaces
    expect(loggerMock.warn.mock.calls[6]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set _3', regexp, 'set _3']]); // empty spaces
    expect(loggerMock.warn.mock.calls[7]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['_set_2', regexp, '_set_2']]); // start with a letter
    expect(loggerMock.warn.mock.calls[8]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set_1234567890_1234567890_234567890_1234567890_1234567890', regexp, 'set_1234567890_1234567890_234567890_1234567890_1234567890']]); // max of 50 characters
    expect(loggerMock.error.mock.calls[1]).toEqual([ERROR_SETS_FILTER_EXCLUSIVE]);

    expect(validateSplitFilters(loggerMock, splitFilters[8], PRODUCER_MODE)).toEqual(getOutput(8)); // lowercase and dedupe
    expect(loggerMock.warn.mock.calls[9]).toEqual([WARN_SPLITS_FILTER_LOWERCASE_SET, ['SET_2']]); // lowercase
    expect(loggerMock.warn.mock.calls[10]).toEqual([WARN_SPLITS_FILTER_LOWERCASE_SET, ['set_B']]); // lowercase
    expect(loggerMock.warn.mock.calls[11]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set_3!', regexp, 'set_3!']]); // special character
    expect(loggerMock.error.mock.calls[2]).toEqual([ERROR_SETS_FILTER_EXCLUSIVE]);

    expect(loggerMock.warn.mock.calls.length).toEqual(12);
    expect(loggerMock.error.mock.calls.length).toEqual(3);
  });

  test('validateFlagSets - Flag set validation for evaluations', () => {

    let flagSetsFilter = ['set_1', 'set_2'];

    // empty array
    expect(validateFlagSets(loggerMock, 'test_method', [], flagSetsFilter)).toEqual([]);

    // must start with a letter or number
    expect(validateFlagSets(loggerMock, 'test_method', ['_set_1'], flagSetsFilter)).toEqual([]);
    expect(loggerMock.warn.mock.calls[0]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['_set_1', regexp, '_set_1']]);

    // can contain _a-z0-9
    expect(validateFlagSets(loggerMock, 'test_method', ['set*1'], flagSetsFilter)).toEqual([]);
    expect(loggerMock.warn.mock.calls[1]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set*1', regexp, 'set*1']]);

    // have a max length of 50 characters
    const longName = '1234567890_1234567890_1234567890_1234567890_1234567890';
    expect(validateFlagSets(loggerMock, 'test_method', [longName], flagSetsFilter)).toEqual([]);
    expect(loggerMock.warn.mock.calls[2]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, [longName, regexp, longName]]);

    // both set names invalid -> empty list & warn
    expect(validateFlagSets(loggerMock, 'test_method', ['set*1', 'set*3'], flagSetsFilter)).toEqual([]);
    expect(loggerMock.warn.mock.calls[3]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set*1', regexp, 'set*1']]);
    expect(loggerMock.warn.mock.calls[4]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set*3', regexp, 'set*3']]);

    // only set_1 is valid => [set_1] & warn
    expect(validateFlagSets(loggerMock, 'test_method', ['set_1', 'set*3'], flagSetsFilter)).toEqual(['set_1']);
    expect(loggerMock.warn.mock.calls[5]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set*3', regexp, 'set*3']]);

    // set_3 not included in configuration but set_1 included => [set_1] & warn
    expect(validateFlagSets(loggerMock, 'test_method', ['set_1', 'set_3'], flagSetsFilter)).toEqual(['set_1']);
    expect(loggerMock.warn.mock.calls[6]).toEqual([WARN_FLAGSET_NOT_CONFIGURED, ['test_method', 'set_3']]);

    // set_3 not included in configuration => [] & warn
    expect(validateFlagSets(loggerMock, 'test_method', ['set_3'], flagSetsFilter)).toEqual([]);
    expect(loggerMock.warn.mock.calls[7]).toEqual([WARN_FLAGSET_NOT_CONFIGURED, ['test_method', 'set_3']]);

    // empty config


    // must start with a letter or number
    expect(validateFlagSets(loggerMock, 'test_method', ['_set_1'], [])).toEqual([]);
    expect(loggerMock.warn.mock.calls[8]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['_set_1', regexp, '_set_1']]);

    // can contain _a-z0-9
    expect(validateFlagSets(loggerMock, 'test_method', ['set*1'], [])).toEqual([]);
    expect(loggerMock.warn.mock.calls[9]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set*1', regexp, 'set*1']]);

    // have a max length of 50 characters
    expect(validateFlagSets(loggerMock, 'test_method', [longName], [])).toEqual([]);
    expect(loggerMock.warn.mock.calls[10]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, [longName, regexp, longName]]);

    // both set names invalid -> empty list & warn
    expect(validateFlagSets(loggerMock, 'test_method', ['set*1', 'set*3'], [])).toEqual([]);
    expect(loggerMock.warn.mock.calls[11]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set*1', regexp, 'set*1']]);
    expect(loggerMock.warn.mock.calls[12]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set*3', regexp, 'set*3']]);

    // only set_1 is valid => [set_1] & warn
    expect(validateFlagSets(loggerMock, 'test_method', ['set_1', 'set*3'], [])).toEqual(['set_1']);
    expect(loggerMock.warn.mock.calls[13]).toEqual([WARN_SPLITS_FILTER_INVALID_SET, ['set*3', regexp, 'set*3']]);

    // any set should be returned if there isn't flag sets in filter
    expect(validateFlagSets(loggerMock, 'test_method', ['set_1'], [])).toEqual(['set_1']);
    expect(validateFlagSets(loggerMock, 'test_method', ['set_1', 'set_2'], [])).toEqual(['set_1', 'set_2']);
    expect(validateFlagSets(loggerMock, 'test_method', ['set_3'], [])).toEqual(['set_3']);

  });

});
