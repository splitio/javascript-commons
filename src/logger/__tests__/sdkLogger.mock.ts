/**
 * This util mocks the logFactory at sdkLogger module, to spy on it
 */

jest.mock('../sdkLogger');

import { logFactory } from '../sdkLogger';

export const loggerMock = {
  w: jest.fn(),
  e: jest.fn(),
  d: jest.fn(),
  i: jest.fn(),
};

(logFactory as jest.Mock).mockReturnValue(loggerMock);

export function mockClear() {
  loggerMock.w.mockClear();
  loggerMock.e.mockClear();
  loggerMock.d.mockClear();
  loggerMock.i.mockClear();
}
