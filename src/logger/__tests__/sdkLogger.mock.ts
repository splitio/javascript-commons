
export const loggerMock = {
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  setLogLevel: jest.fn(),

  mockClear() {
    this.warn.mockClear();
    this.error.mockClear();
    this.debug.mockClear();
    this.info.mockClear();
    this.setLogLevel.mockClear();
  }
};
