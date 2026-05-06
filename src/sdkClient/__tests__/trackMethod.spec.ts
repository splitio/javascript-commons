import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { trackMethodFactory } from '../trackMethod';
import { STANDALONE_MODE } from '../../utils/constants';
import { ISdkFactoryContext } from '../../sdkFactory/types';

const readinessManagerMock = {
  isReady: jest.fn(() => true),
  isReadyFromCache: jest.fn(() => true),
  isDestroyed: jest.fn(() => false),
  isTimedout: jest.fn(() => false),
  hasTimedout: jest.fn(() => false),
  destroy: jest.fn(),
};

const eventTrackerMock = {
  track: jest.fn(() => true),
};

const telemetryTrackerMock = {
  trackEval: jest.fn(() => jest.fn()),
};

const definitionsMock = {
  getAll: jest.fn(() => []),
  get: jest.fn(() => null),
  trafficTypeExists: jest.fn(() => true),
};

const trackMethodParams = {
  settings: { log: loggerMock, mode: STANDALONE_MODE } as any,
  eventTracker: eventTrackerMock as any,
  telemetryTracker: telemetryTrackerMock as any,
  sdkReadinessManager: { readinessManager: readinessManagerMock },
  storage: { definitions: definitionsMock },
} as unknown as ISdkFactoryContext;

describe('trackMethodFactory', () => {

  beforeEach(() => {
    loggerMock.mockClear();
    eventTrackerMock.track.mockClear();
    telemetryTrackerMock.trackEval.mockClear();
    readinessManagerMock.isDestroyed.mockReturnValue(false);
  });

  test('Should return true when the event was successfully tracked', () => {
    const track = trackMethodFactory(trackMethodParams);

    const result = track('validKey', 'user', 'my.event', 10, { prop: 'value' });

    expect(result).toBe(true);
    expect(eventTrackerMock.track).toBeCalledTimes(1);
    expect(eventTrackerMock.track).toBeCalledWith(
      expect.objectContaining({
        eventTypeId: 'my.event',
        trafficTypeName: 'user',
        value: 10,
        key: 'validKey',
        properties: { prop: 'value' },
      }),
      expect.any(Number),
    );
    expect(telemetryTrackerMock.trackEval).toBeCalledTimes(1);
    expect(loggerMock.error).not.toBeCalled();
  });

  test('Should return false when SDK is destroyed', () => {
    readinessManagerMock.isDestroyed.mockReturnValue(true);
    const track = trackMethodFactory(trackMethodParams);

    const result = track('validKey', 'user', 'my.event');

    expect(result).toBe(false);
    expect(eventTrackerMock.track).not.toBeCalled();
    expect(loggerMock.error).toBeCalled();
  });

  test('Should return false when no key is provided', () => {
    const track = trackMethodFactory(trackMethodParams);

    // @ts-expect-error testing invalid input
    const result = track(undefined, 'user', 'my.event');

    expect(result).toBe(false);
    expect(eventTrackerMock.track).not.toBeCalled();
    expect(loggerMock.error).toBeCalled();
  });
});
