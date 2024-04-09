import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { readCSV } from '../../../__tests__/testUtils/csv';

test('MATCHER REGEX (STRING) / should match the attribute value only with the string starts with hello', () => {
  // @ts-ignore
  const matcher = matcherFactory(loggerMock, {
    type: matcherTypes.MATCHES_STRING,
    value: '^hello'
  } as IMatcherDto) as IMatcher;

  expect(matcher('abc')).toBe(false);
  expect(matcher('hello dude!')).toBe(true);
});

test('MATCHER REGEX (STRING) / incorrectly matches unicode characters', () => {
  // @ts-ignore
  const matcher = matcherFactory(loggerMock, {
    type: matcherTypes.MATCHES_STRING,
    value: 'a.b'
  } as IMatcherDto) as IMatcher;

  expect(matcher('aXXb')).toBe(false);
  expect(matcher('a𝌆b')).toBe(false);
});

[
  'regex.txt'
].forEach(filename => {

  test('MATCHER REGEX (STRING) / validate regex behavior using sample data', async () => {
    const lines = await readCSV(require.resolve(`./mocks/${filename}`), '#');

    for (const [regex, input, test] of lines) {
      const isTestTrue = test === 'true';

      // @ts-ignore
      const matcher = matcherFactory(loggerMock, {
        type: matcherTypes.MATCHES_STRING,
        value: regex
      } as IMatcherDto) as IMatcher;

      expect(matcher(input) === isTestTrue).toBe(true);
    }
  });

});
