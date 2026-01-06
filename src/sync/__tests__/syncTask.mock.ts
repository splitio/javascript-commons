export function syncTaskFactory() {
  return {
    execute: jest.fn(() => Promise.resolve(true)),
    isExecuting: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn(),
  };
}
