import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '../index';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { readCSV } from '../../../__tests__/testUtils/csv';

test('MATCHER BETWEEN SEMVER', async () => {
  const data = await readCSV(require.resolve('./mocks/between-semver.csv'));

  for (const [start, between, end, expected] of data) {
    const matcher = matcherFactory(loggerMock, {
      negate: false,
      type: matcherTypes.BETWEEN_SEMVER,
      value: {
        start: start,
        end: end
      }
    } as IMatcherDto) as IMatcher;

    expect(matcher(between)).toBe(JSON.parse(expected));
  }
});
