
import * as LabelConstants from '../../labels';

import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

import { validateSplitExistence } from '../splitExistence';
import { IReadinessManager } from '../../../readiness/types';
import { WARN_NOT_EXISTENT_SPLIT } from '../../../logger/constants';

describe('Split existence (special case)', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Should return a boolean indicating if the SDK was ready and there was no Split object or "definition not found" label', () => {
    // @ts-expect-error
    let readinessManagerMock = {
      isReady: jest.fn(() => false) // Fake the signal for the non ready SDK
    } as IReadinessManager;

    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'some_split', {}, 'test_method')).toBe(true); // Should always return true when the SDK is not ready.
    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'some_split', null, 'test_method')).toBe(true); // Should always return true when the SDK is not ready.
    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'some_split', undefined, 'test_method')).toBe(true); // Should always return true when the SDK is not ready.
    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'some_split', 'a label', 'test_method')).toBe(true); // Should always return true when the SDK is not ready.
    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'some_split', LabelConstants.SPLIT_NOT_FOUND, 'test_method')).toBe(true); // Should always return true when the SDK is not ready.

    expect(loggerMock.warn).not.toBeCalled(); // There should have been no warning logs since the SDK was not ready yet.
    expect(loggerMock.error).not.toBeCalled(); // There should have been no error logs since the SDK was not ready yet.

    // Prepare the mock to fake that the SDK is ready now.
    (readinessManagerMock.isReady as jest.Mock).mockImplementation(() => true);

    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'other_split', {}, 'other_method')).toBe(true); // Should return true if it receives a Split Object instead of null (when the object is not found, for manager).
    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'other_split', 'a label', 'other_method')).toBe(true); // Should return true if it receives a Label and it is not split not found (when the Split was not found on the storage, for client).

    expect(loggerMock.warn).not.toBeCalled(); // There should have been no warning logs since the values we used so far were considered valid.
    expect(loggerMock.error).not.toBeCalled(); // There should have been no error logs since the values we used so far were considered valid.

    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'other_split', null, 'other_method')).toBe(false); // Should return false if it receives a non-truthy value as a split object or label
    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'other_split', undefined, 'other_method')).toBe(false); // Should return false if it receives a non-truthy value as a split object or label
    expect(validateSplitExistence(loggerMock, readinessManagerMock, 'other_split', LabelConstants.SPLIT_NOT_FOUND, 'other_method')).toBe(false); // Should return false if it receives a label but it is the split not found one.

    expect(loggerMock.warn).toBeCalledTimes(3); // It should have logged 3 warnings, one per each time we called it
    loggerMock.warn.mock.calls.forEach(call => expect(call).toEqual([WARN_NOT_EXISTENT_SPLIT, ['other_method', 'other_split']])); // Warning logs should have the correct message.

    expect(loggerMock.error).not.toBeCalled(); // We log warnings, not errors.
  });
});
