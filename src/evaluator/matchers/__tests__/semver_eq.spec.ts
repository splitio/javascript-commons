import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '../index';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { readCSV } from '../../../__tests__/testUtils/csv';

test('MATCHER EQUAL TO SEMVER', async () => {
  const data = await readCSV(require.resolve('./mocks/equal-to-semver.csv'));

  for (const [ruleSemver, runtimeSemver, result] of data) {
    let matcher = matcherFactory(loggerMock, {
      negate: false,
      type: matcherTypes.EQUAL_TO_SEMVER,
      value: ruleSemver
    } as IMatcherDto) as IMatcher;

    expect(matcher(runtimeSemver)).toBe(JSON.parse(result));
  }
});
