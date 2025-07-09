import SplitIO from '../../../types/splitio';

export const loggerMock = {
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  setLogLevel: jest.fn(),
  setLogger: jest.fn(),

  mockClear() {
    this.warn.mockClear();
    this.error.mockClear();
    this.debug.mockClear();
    this.info.mockClear();
    this.setLogLevel.mockClear();
  }
};

export function getLoggerLogLevel(logger: any): SplitIO.LogLevel | undefined {
  if (logger) return logger.options.logLevel;
}
