import { getEventSource } from '../browser';

test('getEventSource returns global EventSource in Browser', () => {
  const EventSourceMock = jest.fn();
  const originalEventSource = global.EventSource;
  global.EventSource = EventSourceMock as any;

  expect(getEventSource()).toBe(EventSourceMock);

  global.EventSource = originalEventSource;
});

test('getEventSource returns undefined when EventSource is not available', () => {
  expect(getEventSource()).toBeUndefined();
});
