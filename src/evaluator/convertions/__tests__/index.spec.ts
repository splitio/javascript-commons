import { zeroSinceHH, zeroSinceSS } from '../index';

test('CONVERTIONS / zero since HH should change the date in a way we only have dd-mm-yyyy since midnight in UTC', () => {

  expect(zeroSinceHH(1459881314917)).toBe( 1459814400000); // Tue Apr 05 2016
  expect(zeroSinceHH(1420113683000)).toBe( 1420070400000); // Thu Jan 01 2015
});

test('CONVERTIONS / zero since SS should change the date in a way we only have dd mm yyyy hh mm since midnight in UTC', () => {

  expect(zeroSinceSS(1420110671000)).toBe( 1420110660000); // 01 Jan 2015 11:11:11 UT should be transformed to 01 Jan 2015 11:11:00 UT
  expect(zeroSinceSS(953683199000)).toBe( 953683140000); // 21 Mar 2000 23:59:59 UT should be transformed to 21 Mar 2000 23:59:00 UT
});
