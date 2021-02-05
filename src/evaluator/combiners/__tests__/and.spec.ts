import andCombiner from '../and';

test('COMBINER AND / should always return true', async function () {

  let AND = andCombiner([() => true, () => true, () => true]);

  expect(await AND('always true')).toBe(true); // should always return true
});

test('COMBINER AND / should always return false', async function () {

  let AND = andCombiner([() => true, () => true, () => false]);

  expect(await AND('always false')).toBe(false); // should always return false
});
