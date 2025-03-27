import { andCombinerContext } from '../and';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('COMBINER AND / should always return true', async () => {

  let AND = andCombinerContext(loggerMock, [() => true, () => true, () => true]);

  expect(await AND('always true')).toBe(true); // should always return true
});

test('COMBINER AND / should always return false', async () => {

  let AND = andCombinerContext(loggerMock, [() => true, () => true, () => false]);

  expect(await AND('always false')).toBe(false); // should always return false
});
