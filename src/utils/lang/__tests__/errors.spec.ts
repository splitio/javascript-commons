import { SplitError, SplitNetworkError, SplitTimeoutError } from '../errors';

test('LANG UTILS / errors', () => {
  const splitErrorInst = new SplitError(); // This one should not be used directly, so only testing default message
  let splitNetErrorInst = new SplitNetworkError();
  let splitTimeErrorInst = new SplitTimeoutError();

  expect(splitErrorInst.message).toBe('Split Error'); // The errors should have a default message.
  expect(splitNetErrorInst.message).toBe('Split Network Error'); // The errors should have a default message.
  expect(splitTimeErrorInst.message).toBe('Split Timeout Error'); // The errors should have a default message.

  splitNetErrorInst = new SplitNetworkError('NETWORK_ERR', 341);

  expect(splitNetErrorInst.message).toBe('NETWORK_ERR'); // Split Network Error should store params (message) correctly
  expect(splitNetErrorInst.statusCode).toBe(341); // Split Network Error should store params (status code) correctly
  expect(splitNetErrorInst instanceof SplitNetworkError).toBeTruthy();
  expect(splitNetErrorInst instanceof SplitError).toBeTruthy(); // All custom errors should extend from the root one
  expect(splitNetErrorInst instanceof Error).toBeTruthy(); // All custom errors should extend from the native one.

  splitTimeErrorInst = new SplitTimeoutError('TIMEOUT_ERR');

  expect(splitTimeErrorInst.message).toBe('TIMEOUT_ERR'); // Split Network Error should store params (message) correctly
  expect(splitTimeErrorInst instanceof SplitTimeoutError).toBeTruthy();
  expect(splitTimeErrorInst instanceof SplitError).toBeTruthy(); // All custom errors should extend from the root one.
  expect(splitTimeErrorInst instanceof Error).toBeTruthy(); // All custom errors should extend from the native one.

});
