import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '../index';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { _Set } from '../../../utils/lang/sets';

describe('MATCHER IN LIST SEMVER', () => {

  test('List with some values', () => {
    const list = new _Set(['1.1.1', '1.1.1+build']);

    const matcher = matcherFactory(loggerMock, {
      type: matcherTypes.IN_LIST_SEMVER,
      value: list
    } as IMatcherDto) as IMatcher;

    expect(matcher('1.1.1+build')).toBe(true); // "key1" should be true
    expect(matcher('1.1.1+build2')).toBe(false); // "another key" should be false

    expect(() => matcher('invalid')).toThrowError('Unable to convert to Semver, incorrect format: invalid');
  });

  test('Empty list', () => {
    expect(() => {
      matcherFactory(loggerMock, {
        type: matcherTypes.IN_LIST_SEMVER,
        value: new _Set()
      } as IMatcherDto) as IMatcher;
    }).toThrowError('whitelistMatcherData is required for IN_LIST_SEMVER matcher type');
  });

  test('List with invalid value', () => {
    expect(() => {
      matcherFactory(loggerMock, {
        type: matcherTypes.IN_LIST_SEMVER,
        value: new _Set(['invalid', '1.2.3'])
      } as IMatcherDto) as IMatcher;
    }).toThrowError('Unable to convert to Semver, incorrect format: invalid');
  });
});
