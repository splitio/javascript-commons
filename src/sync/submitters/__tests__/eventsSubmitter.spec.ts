import { eventsSubmitterFactory } from '../eventsSubmitter';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { EventsCacheInMemory } from '../../../storages/inMemory/EventsCacheInMemory';


describe('Events submitter', () => {

  let __onFullQueueCb: () => void;
  const eventsCacheMock = {
    isEmpty: jest.fn(() => true),
    setOnFullQueueCb: jest.fn(function (onFullQueueCb) { __onFullQueueCb = onFullQueueCb; })
  };
  const params = {
    settings: {
      log: loggerMock,
      scheduler: { eventsPushRate: 30000 },
      startup: { eventsFirstPushWindow: 0 }
    },
    splitApi: {},
    storage: { events: eventsCacheMock }
  };

  beforeEach(() => {
    eventsCacheMock.isEmpty.mockClear();
  });

  test('with eventsFirstPushWindow', async () => {
    const eventsFirstPushWindow = 20;
    params.settings.startup.eventsFirstPushWindow = eventsFirstPushWindow; // @ts-ignore
    const eventsSubmitter = eventsSubmitterFactory(params);

    eventsSubmitter.start();
    expect(eventsSubmitter.isRunning()).toEqual(true); // Submitter should be flagged as running
    expect(eventsSubmitter.isExecuting()).toEqual(false); // but not executed immediately if there is a push window
    expect(eventsCacheMock.isEmpty).not.toBeCalled();

    // If queue is full, submitter should be executed
    __onFullQueueCb();
    expect(eventsSubmitter.isExecuting()).toEqual(true);
    expect(eventsCacheMock.isEmpty).toBeCalledTimes(1);

    // Await first push window
    await new Promise(res => setTimeout(res, eventsFirstPushWindow + 10));
    expect(eventsCacheMock.isEmpty).toBeCalledTimes(2); // after the push window, submitter should have been executed

    expect(eventsSubmitter.isRunning()).toEqual(true);
    eventsSubmitter.stop();
    expect(eventsSubmitter.isRunning()).toEqual(false);
  });

  test('without eventsFirstPushWindow', (done) => {
    const eventsFirstPushWindow = 0;
    params.settings.startup.eventsFirstPushWindow = eventsFirstPushWindow; // @ts-ignore
    const eventsSubmitter = eventsSubmitterFactory(params);

    eventsSubmitter.start();
    expect(eventsSubmitter.isRunning()).toEqual(true); // Submitter should be flagged as running
    expect(eventsSubmitter.isExecuting()).toEqual(true); // and executes immediately if there isn't a push window
    expect(eventsCacheMock.isEmpty).toBeCalledTimes(1);

    // If queue is full, submitter is executed again after current execution is resolved
    __onFullQueueCb();
    expect(eventsCacheMock.isEmpty).toBeCalledTimes(1);

    setTimeout(()=> {
      expect(eventsSubmitter.isExecuting()).toEqual(false);
      expect(eventsCacheMock.isEmpty).toBeCalledTimes(2); // 2 executions: 1st due to start and 2nd due to full queue

      expect(eventsSubmitter.isRunning()).toEqual(true);
      eventsSubmitter.stop();
      expect(eventsSubmitter.isRunning()).toEqual(false);
      done();
    });
  });

  test('doesn\'t drop items from cache when POST is resolved', (done) => {
    const eventsCacheInMemory = new EventsCacheInMemory();
    const params = {
      settings: { log: loggerMock, scheduler: { eventsPushRate: 100 }, startup: { eventsFirstPushWindow: 0 } },
      storage: { events: eventsCacheInMemory },
      splitApi: { postEventsBulk: jest.fn(() => Promise.resolve()) },
    }; // @ts-ignore
    const eventsSubmitter = eventsSubmitterFactory(params);

    eventsCacheInMemory.track({ eventTypeId: 'event1', timestamp: 1 });

    eventsSubmitter.start();
    expect(params.splitApi.postEventsBulk.mock.calls).toEqual([['[{"eventTypeId":"event1","timestamp":1}]']]);

    // Tracking event when POST is pending
    eventsCacheInMemory.track({ eventTypeId: 'event2', timestamp: 1 });
    // Tracking event when POST is resolved
    setTimeout(() => { eventsCacheInMemory.track({ eventTypeId: 'event3', timestamp: 1 }); });

    setTimeout(() => {
      expect(params.splitApi.postEventsBulk.mock.calls).toEqual([
        // POST with event1
        ['[{"eventTypeId":"event1","timestamp":1}]'],
        // POST with event2 and event3
        ['[{"eventTypeId":"event2","timestamp":1},{"eventTypeId":"event3","timestamp":1}]']
      ]);
      eventsSubmitter.stop();

      done();
    }, params.settings.scheduler.eventsPushRate + 10);
  });

});
