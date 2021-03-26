import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { SplitIO } from '../../types';
import eventTrackerFactory from '../eventTracker';

/* Mocks */

const fakeEventsCache = {
  track: jest.fn()
};

const fakeIntegrationsManager = {
  handleEvent: jest.fn()
};

/* Tests */
describe('Event Tracker', () => {

  test('Tracker API', () => {
    expect(typeof eventTrackerFactory).toBe('function'); // The module should return a function which acts as a factory.

    const instance = eventTrackerFactory(loggerMock, fakeEventsCache, fakeIntegrationsManager);

    expect(typeof instance.track).toBe('function'); // The instance should implement the track method.
  });

  test('Propagate the event into the event cache and integrations manager, and return its result (a boolean or a promise that resolves to boolean)', (done) => {
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

    fakeEventsCache.track.mockImplementation((eventData: SplitIO.EventData, size: number) => {
      if (eventData === fakeEvent) {
        switch (size) {
          case 1: return true;
          case 2: return Promise.resolve(false);
          case 3: return Promise.resolve(true);
        }
      }
    });

    const tracker = eventTrackerFactory(loggerMock, fakeEventsCache, fakeIntegrationsManager);
    const result1 = tracker.track(fakeEvent, 1);

    expect(fakeEventsCache.track.mock.calls[0]).toEqual([fakeEvent, 1]); // Should be present in the event cache.
    expect(fakeIntegrationsManager.handleEvent).not.toBeCalled(); // The integration manager handleEvent method should not be executed synchronously.
    expect(result1).toBe(true); // Should return the value of the event cache.

    setTimeout(() => {
      expect(fakeIntegrationsManager.handleEvent.mock.calls[0]).toEqual([fakeEvent]); // A copy of the tracked event should be sent to integration manager after the timeout wrapping make it to the queue stack.
      expect(fakeIntegrationsManager.handleEvent.mock.calls[0][0]).not.toBe(fakeEvent); // Should not send the original event.

      const result2 = tracker.track(fakeEvent, 2) as Promise<boolean>;

      expect(fakeEventsCache.track.mock.calls[1]).toEqual([fakeEvent, 2]); // Should be present in the event cache.

      result2.then(tracked => {
        expect(tracked).toBe(false); // Should return the value of the event cache resolved promise.

        setTimeout(() => {
          expect(fakeIntegrationsManager.handleEvent).toBeCalledTimes(1); // Untracked event should not be sent to integration manager.

          const result3 = tracker.track(fakeEvent, 3) as Promise<boolean>;

          expect(fakeEventsCache.track.mock.calls[2]).toEqual([fakeEvent, 3]); // Should be present in the event cache.

          result3.then(tracked => {
            expect(fakeIntegrationsManager.handleEvent).toBeCalledTimes(1); // Tracked event should not be sent to integration manager synchronously
            expect(tracked).toBe(true); // Should return the value of the event cache resolved promise.

            setTimeout(() => {
              expect(fakeIntegrationsManager.handleEvent.mock.calls[1]).toEqual([fakeEvent]); // A copy of tracked event should be sent to integration manager after the timeout wrapping make it to the queue stack.
              expect(fakeIntegrationsManager.handleEvent.mock.calls[1][0]).not.toBe(fakeEvent); // Should not send the original event.

              done();
            }, 0);
          });

        }, 0);
      });
    }, 0);
  });

});
