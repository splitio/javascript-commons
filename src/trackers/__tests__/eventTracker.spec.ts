import { SplitIO } from '../../types';
import { QUEUED } from '../../utils/constants';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import { eventTrackerFactory } from '../eventTracker';

/* Mocks */

const fakeEventsCache = {
  track: jest.fn()
};

const fakeTelemetryCache = {
  recordEventStats: jest.fn()
};

const fakeIntegrationsManager = {
  handleEvent: jest.fn()
};

const fakeEvent = {
  eventTypeId: 'eventTypeId',
  trafficTypeName: 'trafficTypeName',
  value: 0,
  timestamp: Date.now(),
  key: 'matchingKey',
  properties: {
    prop1: 'prop1',
    prop2: 0,
  }
};

const fakeWhenInit = (cb: () => void) => cb();

/* Tests */
describe('Event Tracker', () => {

  test('Tracker API', () => {
    expect(typeof eventTrackerFactory).toBe('function'); // The module should return a function which acts as a factory.

    const instance = eventTrackerFactory(fullSettings, fakeEventsCache, fakeWhenInit, fakeIntegrationsManager);

    expect(typeof instance.track).toBe('function'); // The instance should implement the track method.
  });

  test('Propagate the event into the event cache and integrations manager, and return its result (a boolean or a promise that resolves to boolean)', async () => {
    fakeEventsCache.track.mockImplementation((eventData: SplitIO.EventData, size: number) => {
      if (eventData === fakeEvent) {
        switch (size) {
          case 1: return true;
          case 2: return Promise.resolve(false);
          case 3: return Promise.resolve(true);
        }
      }
    });
    // @ts-ignore
    const tracker = eventTrackerFactory(fullSettings, fakeEventsCache, fakeWhenInit, fakeIntegrationsManager, fakeTelemetryCache);
    const result1 = tracker.track(fakeEvent, 1);

    expect(fakeEventsCache.track.mock.calls[0]).toEqual([fakeEvent, 1]); // Should be present in the event cache.
    expect(fakeIntegrationsManager.handleEvent).not.toBeCalled(); // The integration manager handleEvent method should not be executed synchronously.
    expect(result1).toBe(true); // Should return the value of the event cache.
    expect(fakeTelemetryCache.recordEventStats).toBeCalledWith(QUEUED, 1);

    await new Promise(res => setTimeout(res));
    expect(fakeIntegrationsManager.handleEvent.mock.calls[0]).toEqual([fakeEvent]); // A copy of the tracked event should be sent to integration manager after the timeout wrapping make it to the queue stack.
    expect(fakeIntegrationsManager.handleEvent.mock.calls[0][0]).not.toBe(fakeEvent); // Should not send the original event.

    const result2 = tracker.track(fakeEvent, 2) as Promise<boolean>;

    expect(fakeEventsCache.track.mock.calls[1]).toEqual([fakeEvent, 2]); // Should be present in the event cache.

    let tracked = await result2;
    expect(tracked).toBe(false); // Should return the value of the event cache resolved promise.

    await new Promise(res => setTimeout(res));
    expect(fakeIntegrationsManager.handleEvent).toBeCalledTimes(1); // Untracked event should not be sent to integration manager.

    const result3 = tracker.track(fakeEvent, 3) as Promise<boolean>;

    expect(fakeEventsCache.track.mock.calls[2]).toEqual([fakeEvent, 3]); // Should be present in the event cache.

    tracked = await result3;
    expect(fakeIntegrationsManager.handleEvent).toBeCalledTimes(1); // Tracked event should not be sent to integration manager synchronously
    expect(tracked).toBe(true); // Should return the value of the event cache resolved promise.

    await new Promise(res => setTimeout(res));
    expect(fakeIntegrationsManager.handleEvent.mock.calls[1]).toEqual([fakeEvent]); // A copy of tracked event should be sent to integration manager after the timeout wrapping make it to the queue stack.
    expect(fakeIntegrationsManager.handleEvent.mock.calls[1][0]).not.toBe(fakeEvent); // Should not send the original event.

    expect(fakeTelemetryCache.recordEventStats).toBeCalledTimes(1); // Only the first of the 3 track calls is using sync events cache
  });

  test('Should track or not events depending on user consent status', () => {
    const settings = { ...fullSettings };
    const fakeEventsCache = { track: jest.fn(() => true) };

    const tracker = eventTrackerFactory(settings, fakeEventsCache, fakeWhenInit);

    expect(tracker.track(fakeEvent)).toBe(true);
    expect(fakeEventsCache.track).toBeCalledTimes(1); // event should be tracked if userConsent is undefined

    settings.userConsent = 'UNKNOWN';
    expect(tracker.track(fakeEvent)).toBe(true);
    expect(fakeEventsCache.track).toBeCalledTimes(2); // event should be tracked if userConsent is unknown

    settings.userConsent = 'GRANTED';
    expect(tracker.track(fakeEvent)).toBe(true);
    expect(fakeEventsCache.track).toBeCalledTimes(3); // event should be tracked if userConsent is granted

    settings.userConsent = 'DECLINED';
    expect(tracker.track(fakeEvent)).toBe(false);
    expect(fakeEventsCache.track).toBeCalledTimes(3); // event should not be tracked if userConsent is declined
  });

});
