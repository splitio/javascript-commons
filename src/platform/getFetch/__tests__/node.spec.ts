import { getFetch } from '../node';

test('getFetch returns node-fetch module in Node', () => {
  expect(getFetch()).toBe(require('node-fetch'));
});
