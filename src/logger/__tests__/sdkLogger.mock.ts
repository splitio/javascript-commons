/**
 * This util mocks the logFactory at sdkLogger module, to spy on it
 */

jest.mock('../sdkLogger');

import { logFactory } from '../sdkLogger';

export const loggerMock = {
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

(logFactory as jest.Mock).mockReturnValue(loggerMock);

export function mockClear() {
  loggerMock.warn.mockClear();
  loggerMock.error.mockClear();
  loggerMock.debug.mockClear();
  loggerMock.info.mockClear();
}
