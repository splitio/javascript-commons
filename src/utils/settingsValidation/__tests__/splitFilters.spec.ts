import { loggerMock, mockClear } from '../../../logger/__tests__/sdkLogger.mock';

import { STANDALONE_MODE, CONSUMER_MODE } from '../../constants';

// Split filter and QueryStrings examples
import { splitFilters, queryStrings, groupedFilters } from '../../../__tests__/mocks/fetchSpecificSplits';

// Test target
import { validateSplitFilters } from '../splitFilters';

describe('validateSplitFilters', () => {

  let defaultOutput = {
    validFilters: [],
    queryString: null,
    groupedFilters: { byName: [], byPrefix: [] }
  };

  test('Returns default output with empty values if `splitFilters` is an invalid object or `mode` is not \'standalone\'', () => {

    expect(validateSplitFilters(undefined, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(validateSplitFilters(null, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(loggerMock.w.mock.calls.length === 0).toBe(true);

    expect(validateSplitFilters(true, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(loggerMock.w.mock.calls[0]).toEqual(['Factory instantiation: splitFilters configuration must be a non-empty array of filter objects.']);

    expect(validateSplitFilters(15, STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(loggerMock.w.mock.calls[1]).toEqual(['Factory instantiation: splitFilters configuration must be a non-empty array of filter objects.']);

    expect(validateSplitFilters('string', STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(loggerMock.w.mock.calls[2]).toEqual(['Factory instantiation: splitFilters configuration must be a non-empty array of filter objects.']);

    expect(validateSplitFilters([], STANDALONE_MODE)).toEqual(defaultOutput); // splitFilters ignored if not a non-empty array
    expect(loggerMock.w.mock.calls[3]).toEqual(['Factory instantiation: splitFilters configuration must be a non-empty array of filter objects.']);

    expect(validateSplitFilters([{ type: 'byName', values: ['split_1'] }], CONSUMER_MODE)).toEqual(defaultOutput);
    expect(loggerMock.w.mock.calls[4]).toEqual(["Factory instantiation: split filters have been configured but will have no effect if mode is not 'standalone', since synchronization is being deferred to an external tool."]);

    expect(loggerMock.d.mock.calls.length === 0).toBe(true);
    expect(loggerMock.e.mock.calls.length === 0).toBe(true);

    mockClear();
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
    expect(validateSplitFilters(splitFilters, STANDALONE_MODE)).toEqual(output); // filters without values
    expect(loggerMock.d.mock.calls[0]).toEqual(["Factory instantiation: splits filtering criteria is 'null'."]);
    loggerMock.d.mockClear();

    splitFilters.push(
      { type: 'invalid', values: [] },
      { type: 'byName', values: 'invalid' },
      { type: null, values: [] },
      { type: 'byName', values: [13] });
    output.validFilters.push({ type: 'byName', values: [13] });
    expect(validateSplitFilters(splitFilters, STANDALONE_MODE)).toEqual(output); // some filters are invalid
    expect(loggerMock.d.mock.calls).toEqual([["Factory instantiation: splits filtering criteria is 'null'."]]);
    expect(loggerMock.w.mock.calls).toEqual([
      ["Factory instantiation: split filter at position '3' is invalid. It must be an object with a valid filter type ('byName' or 'byPrefix') and a list of 'values'."], // invalid value of `type` property
      ["Factory instantiation: split filter at position '4' is invalid. It must be an object with a valid filter type ('byName' or 'byPrefix') and a list of 'values'."], // invalid type of `values` property
      ["Factory instantiation: split filter at position '5' is invalid. It must be an object with a valid filter type ('byName' or 'byPrefix') and a list of 'values'."] // invalid type of `type` property
    ]);

    expect(loggerMock.e.mock.calls).toEqual([
      ['Factory instantiation: you passed an invalid byName filter value, byName filter value must be a non-empty string.'],
      ['Factory instantiation: byName filter must be a non-empty array.']
    ]);

    mockClear();
  });

  test('Returns object with a queryString, if `splitFilters` contains at least a valid `byName` or `byPrefix` filter with at least a valid value', () => {

    for (let i = 0; i < splitFilters.length; i++) {

      if (groupedFilters[i]) { // tests where validateSplitFilters executes normally
        const output = {
          validFilters: [...splitFilters[i]],
          queryString: queryStrings[i],
          groupedFilters: groupedFilters[i]
        };
        expect(validateSplitFilters(splitFilters[i], STANDALONE_MODE)).toEqual(output); // splitFilters #${i}
        expect(loggerMock.d.mock.calls[loggerMock.d.mock.calls.length - 1]).toEqual([`Factory instantiation: splits filtering criteria is '${queryStrings[i]}'.`]);

      } else { // tests where validateSplitFilters throws an exception
        expect(() => validateSplitFilters(splitFilters[i], STANDALONE_MODE)).toThrow(queryStrings[i]);
      }
    }

    mockClear();
  });

});
