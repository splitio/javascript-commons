import { ILoggerOptions } from '../types';

export const loggerMock = {
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  options: { logLevel: 'NONE', showLevel: true } as ILoggerOptions
};

export function mockClear() {
  loggerMock.warn.mockClear();
  loggerMock.error.mockClear();
  loggerMock.debug.mockClear();
  loggerMock.info.mockClear();
}
