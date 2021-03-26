import { GOOGLE_ANALYTICS_TO_SPLIT, SPLIT_TO_GOOGLE_ANALYTICS } from '../../utils/constants/browser';
import { SPLIT_IMPRESSION, SPLIT_EVENT } from '../../utils/constants';
import { IIntegrationManager } from '../types';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';

// Mock integration modules (GaToSplit and SplitToGa).

jest.mock('../ga/GaToSplit');
import GaToSplitMock from '../ga/GaToSplit';
jest.mock('../ga/SplitToGa');
import SplitToGaMock from '../ga/SplitToGa';

const SplitToGaQueueMethod = jest.fn();
(SplitToGaMock as unknown as jest.Mock).mockImplementation(() => {
  return {
    queue: SplitToGaQueueMethod
  };
});


const fakeParams = {
  storage: 'fakeStorage',
  settings: {
    core: 'fakeCore',
    log: loggerMock
  }
};

function clearMocks() {
  (GaToSplitMock as jest.Mock).mockClear();
  (SplitToGaMock as unknown as jest.Mock).mockClear();
  SplitToGaQueueMethod.mockClear();
}

// Test target
import browserIMF from '../browser';
import { BrowserIntegration } from '../ga/types';

describe('IntegrationsManagerFactory for browser', () => {

  test('API', () => {
    expect(typeof browserIMF).toBe('function'); // The module should return a function which acts as a factory.

    // @ts-expect-error
    const instance1 = browserIMF([]);
    expect(instance1).toBe(undefined); // The instance should be undefined if settings.integrations does not contain integrations that register a listener.

    let integrations: BrowserIntegration[] = [{ type: GOOGLE_ANALYTICS_TO_SPLIT }, { type: SPLIT_TO_GOOGLE_ANALYTICS }];
    const instance2 = browserIMF(integrations, fakeParams as any) as IIntegrationManager;
    expect(GaToSplitMock).toBeCalledTimes(1); // GaToSplit invoked once
    expect(SplitToGaMock).toBeCalledTimes(1); // SplitToGa invoked once
    expect(typeof instance2.handleImpression).toBe('function'); // The instance should implement the handleImpression method if settings.integrations has items that register a listener.
    expect(typeof instance2.handleEvent).toBe('function'); // The instance should implement the handleEvent method if settings.integrations has items that register a listener.

    clearMocks();

    integrations = [{ type: GOOGLE_ANALYTICS_TO_SPLIT }, { type: SPLIT_TO_GOOGLE_ANALYTICS }, { type: GOOGLE_ANALYTICS_TO_SPLIT }, { type: SPLIT_TO_GOOGLE_ANALYTICS }, { type: SPLIT_TO_GOOGLE_ANALYTICS }];
    browserIMF(integrations, fakeParams as any);
    expect(GaToSplitMock).toBeCalledTimes(2); // GaToSplit invoked twice
    expect(SplitToGaMock).toBeCalledTimes(3); // SplitToGa invoked thrice

    clearMocks();
  });

  test('Interaction with GaToSplit integration module', () => {
    const integrations: BrowserIntegration[] = [{
      type: 'GOOGLE_ANALYTICS_TO_SPLIT',
      prefix: 'some-prefix'
    }];
    browserIMF(integrations, fakeParams as any);

    expect((GaToSplitMock as jest.Mock).mock.calls).toEqual([[integrations[0], fakeParams]]); // Invokes GaToSplit integration module with options, storage and core settings

    clearMocks();
  });

  test('Interaction with SplitToGa integration module', () => {
    const integrations: BrowserIntegration[] = [{
      type: 'SPLIT_TO_GOOGLE_ANALYTICS',
      events: true
    }];
    const instance = browserIMF(integrations, fakeParams as any);

    expect((SplitToGaMock as unknown as jest.Mock).mock.calls).toEqual([[fakeParams.settings.log, integrations[0]]]); // Invokes SplitToGa integration module with options

    const fakeImpression = 'fake'; // @ts-expect-error
    instance.handleImpression(fakeImpression);
    expect(SplitToGaQueueMethod.mock.calls).toEqual([[{ payload: fakeImpression, type: SPLIT_IMPRESSION }]]); // Invokes SplitToGa.queue method with tracked impression

    clearMocks();

    const fakeEvent = 'fake'; // @ts-expect-error
    instance.handleEvent(fakeEvent);
    expect(SplitToGaQueueMethod.mock.calls).toEqual([[{ payload: fakeEvent, type: SPLIT_EVENT }]]); // Invokes SplitToGa.queue method with tracked event

    clearMocks();
  });
});
