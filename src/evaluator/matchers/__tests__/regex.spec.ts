import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import fs from 'fs';
import rl from 'readline';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER REGEX (STRING) / should match the attribute value only with the string starts with hello', function () {
  // @ts-ignore
  const matcher = matcherFactory(loggerMock, {
    type: matcherTypes.MATCHES_STRING,
    value: '^hello'
  } as IMatcherDto) as IMatcher;

  expect(matcher('abc')).toBe(false);
  expect(matcher('hello dude!')).toBe(true);
});

test('MATCHER REGEX (STRING) / incorrectly matches unicode characters', function () {
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

  test('MATCHER REGEX (STRING) / validate regex behavior using sample data', (done) => {
    const parser = rl.createInterface({
      terminal: false,
      input: fs.createReadStream(require.resolve(`./mocks/${filename}`))
    });

    parser
      .on('line', line => {
        const parts = line.toString().split('#');

        if (parts.length === 3) {
          let [regex, input, test] = parts;

          const isTestTrue = test === 'true';

          // @ts-ignore
          const matcher = matcherFactory(loggerMock, {
            type: matcherTypes.MATCHES_STRING,
            value: regex
          } as IMatcherDto) as IMatcher;

          expect(matcher(input) === isTestTrue).toBe(true);
        }
      })
      .on('close', done);
  });

});
