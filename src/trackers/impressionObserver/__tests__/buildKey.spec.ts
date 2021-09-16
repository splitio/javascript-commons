import { buildKey } from '../buildKey';
import { generateImpressions } from './testUtils';

test('buildKey', () => { // @ts-ignore
  expect(buildKey({})).toBe('undefined:undefined:undefined:undefined:undefined');

  const imp = generateImpressions(1)[0];
  expect(buildKey(imp)).toBe('key_0:feature_0:someTreatment:in segment all:0');
});
