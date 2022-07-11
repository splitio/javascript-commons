export function syncTaskFactory() {
  return {
    execute: jest.fn(),
    isExecuting: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn(),
  };
}
