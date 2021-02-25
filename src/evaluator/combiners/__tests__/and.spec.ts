import andCombiner from '../and';
import { noopLogger } from '../../../logger/noopLogger';

test('COMBINER AND / should always return true', async function () {

  let AND = andCombiner([() => true, () => true, () => true], noopLogger);

  expect(await AND('always true')).toBe(true); // should always return true
});

test('COMBINER AND / should always return false', async function () {

  let AND = andCombiner([() => true, () => true, () => false], noopLogger);

  expect(await AND('always false')).toBe(false); // should always return false
});
