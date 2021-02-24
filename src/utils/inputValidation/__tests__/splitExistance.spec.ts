
import * as LabelConstants from '../../labels';

import { loggerMock, mockClear } from '../../../logger/__tests__/sdkLogger.mock';

import { validateSplitExistance } from '../splitExistance';
import { IReadinessManager } from '../../../readiness/types';

const errorMsgs = {
  NOT_EXISTENT_SPLIT: (splitName: string) => `you passed "${splitName}" that does not exist in this environment, please double check what Splits exist in the web console.`
};

describe('Split existance (special case)', () => {

  test('Should return a boolean indicating if the SDK was ready and there was no Split object or "definition not found" label', () => {
    // @ts-expect-error
    let readinessManagerMock = {
      isReady: jest.fn(() => false) // Fake the signal for the non ready SDK
    } as IReadinessManager;

    expect(validateSplitExistance(readinessManagerMock, 'some_split', {}, 'test_method')).toBe(true); // Should always return true when the SDK is not ready.
    expect(validateSplitExistance(readinessManagerMock, 'some_split', null, 'test_method')).toBe(true); // Should always return true when the SDK is not ready.
    expect(validateSplitExistance(readinessManagerMock, 'some_split', undefined, 'test_method')).toBe(true); // Should always return true when the SDK is not ready.
    expect(validateSplitExistance(readinessManagerMock, 'some_split', 'a label', 'test_method')).toBe(true); // Should always return true when the SDK is not ready.
    expect(validateSplitExistance(readinessManagerMock, 'some_split', LabelConstants.SPLIT_NOT_FOUND, 'test_method')).toBe(true); // Should always return true when the SDK is not ready.

    expect(loggerMock.w.mock.calls.length).toBe(0); // There should have been no warning logs since the SDK was not ready yet.
    expect(loggerMock.e.mock.calls.length).toBe(0); // There should have been no error logs since the SDK was not ready yet.

    // Prepare the mock to fake that the SDK is ready now.
    (readinessManagerMock.isReady as jest.Mock).mockImplementation(() => true);

    expect(validateSplitExistance(readinessManagerMock, 'other_split', {}, 'other_method')).toBe(true); // Should return true if it receives a Split Object instead of null (when the object is not found, for manager).
    expect(validateSplitExistance(readinessManagerMock, 'other_split', 'a label', 'other_method')).toBe(true); // Should return true if it receives a Label and it is not split not found (when the Split was not found on the storage, for client).

    expect(loggerMock.w.mock.calls.length).toBe(0); // There should have been no warning logs since the values we used so far were considered valid.
    expect(loggerMock.e.mock.calls.length).toBe(0); // There should have been no error logs since the values we used so far were considered valid.

    expect(validateSplitExistance(readinessManagerMock, 'other_split', null, 'other_method')).toBe(false); // Should return false if it receives a non-truthy value as a split object or label
    expect(validateSplitExistance(readinessManagerMock, 'other_split', undefined, 'other_method')).toBe(false); // Should return false if it receives a non-truthy value as a split object or label
    expect(validateSplitExistance(readinessManagerMock, 'other_split', LabelConstants.SPLIT_NOT_FOUND, 'other_method')).toBe(false); // Should return false if it receives a label but it is the split not found one.

    expect(loggerMock.w.mock.calls.length).toBe(3); // It should have logged 3 warnings, one per each time we called it
    loggerMock.w.mock.calls.forEach(call => expect(call[0]).toBe(`other_method: ${errorMsgs.NOT_EXISTENT_SPLIT('other_split')}`)); // Warning logs should have the correct message.

    expect(loggerMock.e.mock.calls.length).toBe(0); // We log warnings, not errors.

    mockClear();
  });
});
