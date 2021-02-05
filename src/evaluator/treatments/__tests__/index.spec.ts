import Treatments from '..';

test('TREATMENTS / parse 2 treatments', () => {
  let t = Treatments.parse([{
    treatment: 'on',
    size: 5
  }, {
    treatment: 'control',
    size: 95
  }]);

  // @ts-ignore
  expect(t._ranges).toEqual([5, 100]);
  // @ts-ignore
  expect(t._treatments).toEqual(['on', 'control']);
});

test('TREATMENTS / parse 1 treatment 100%:on', () => {
  let t = Treatments.parse([{
    treatment: 'on',
    size: 100
  }]);

  // @ts-ignore
  expect(t._ranges).toEqual([100]);
  // @ts-ignore
  expect(t._treatments).toEqual(['on']);
});

test('TREATMENTS / parse 1 treatment 100%:off', () => {
  let t = Treatments.parse([{
    treatment: 'control',
    size: 100
  }]);

  // @ts-ignore
  expect(t._ranges).toEqual([100]);
  // @ts-ignore
  expect(t._treatments).toEqual(['control']);
});

test('TREATMENTS / given a 50%:visa 50%:mastercard we should evaluate correctly', () => {
  let t = Treatments.parse([{
    treatment: 'visa',
    size: 50
  }, {
    treatment: 'mastercard',
    size: 50
  }]);

  expect(t.getTreatmentFor(10)).toBe('visa'); // 10 => visa
  expect(t.getTreatmentFor(50)).toBe('visa'); // 50 => visa
  expect(t.getTreatmentFor(51)).toBe('mastercard'); // 51 => mastercard
  expect(t.getTreatmentFor(100)).toBe('mastercard'); // 100 => mastercard
});
