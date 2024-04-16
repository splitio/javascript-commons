import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '../index';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { readCSV } from '../../../__tests__/testUtils/csv';

test('MATCHER GREATER THAN OR EQUAL TO SEMVER', async () => {
  const data = await readCSV(require.resolve('./mocks/valid-semantic-versions.csv'));

  for (const [higherVersion, lowerVersion] of data) {
    const matcherWithHigherVersion = matcherFactory(loggerMock, {
      negate: false,
      type: matcherTypes.GREATER_THAN_OR_EQUAL_TO_SEMVER,
      value: higherVersion
    } as IMatcherDto) as IMatcher;

    expect(matcherWithHigherVersion(lowerVersion)).toBe(false);
    expect(matcherWithHigherVersion(higherVersion)).toBe(true);

    const matcherWithLowerVersion = matcherFactory(loggerMock, {
      negate: false,
      type: matcherTypes.GREATER_THAN_OR_EQUAL_TO_SEMVER,
      value: lowerVersion
    } as IMatcherDto) as IMatcher;

    expect(matcherWithLowerVersion(lowerVersion)).toBe(true);
    expect(matcherWithLowerVersion(higherVersion)).toBe(true);
  }
});
