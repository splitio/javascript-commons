
export const loggerMock = {
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  setLogLevel: jest.fn()
};

export function mockClear() {
  loggerMock.warn.mockClear();
  loggerMock.error.mockClear();
  loggerMock.debug.mockClear();
  loggerMock.info.mockClear();
  loggerMock.setLogLevel.mockClear();
}
