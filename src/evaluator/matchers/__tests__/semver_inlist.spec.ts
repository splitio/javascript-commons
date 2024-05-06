import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '../index';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

describe('MATCHER IN LIST SEMVER', () => {

  test('List with some values', () => {
    const matcher = matcherFactory(loggerMock, {
      type: matcherTypes.IN_LIST_SEMVER,
      value: ['1.1.1', '1.1.1+build']
    } as IMatcherDto) as IMatcher;

    expect(matcher('1.1.1+build')).toBe(true); // "key1" should be true
    expect(matcher('1.1.1+build2')).toBe(false); // "another key" should be false

    expect(() => matcher('invalid')).toThrowError('Unable to convert to Semver, incorrect format: invalid');
  });

  test('Empty list', () => {
    expect(() => {
      matcherFactory(loggerMock, {
        type: matcherTypes.IN_LIST_SEMVER,
        value: [] as string[]
      } as IMatcherDto) as IMatcher;
    }).toThrowError('whitelistMatcherData is required for IN_LIST_SEMVER matcher type');
  });

  test('List with invalid value', () => {
    expect(() => {
      matcherFactory(loggerMock, {
        type: matcherTypes.IN_LIST_SEMVER,
        value: ['invalid', '1.2.3']
      } as IMatcherDto) as IMatcher;
    }).toThrowError('Unable to convert to Semver, incorrect format: invalid');
  });
});
