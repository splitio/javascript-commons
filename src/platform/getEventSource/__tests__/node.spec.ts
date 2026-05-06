import { getEventSource } from '../node';

test('getEventSource returns eventsource module in Node', () => {
  expect(getEventSource()).toBe(require('../eventsource'));
});
