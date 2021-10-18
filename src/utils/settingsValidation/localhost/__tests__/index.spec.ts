import { validateLocalhost } from '../pluggable';
import { validateLocalhostWithDefault } from '../builtin';
import { LocalhostFromObject } from '../../../../sync/offline/LocalhostFromObject';
import { loggerMock as log } from '../../../../logger/__tests__/sdkLogger.mock';

const localhostModeObject = LocalhostFromObject();

describe('validateLocalhost, for slim SplitFactory', () => {

  afterEach(() => {
    log.error.mockClear();
  });

  test('if mode is LOCALHOST_MODE and localhostMode object is invalid or not provided, returns undefined and logs an error', () => {
    expect(validateLocalhost({ log, sync: {}, mode: 'localhost' })).toBe(undefined);
    expect(validateLocalhost({ log, sync: { localhostMode: null }, mode: 'localhost' })).toBe(undefined);
    expect(validateLocalhost({ log, sync: { localhostMode: () => { } }, mode: 'localhost' })).toBe(undefined);
    expect(log.error).toBeCalledTimes(3); // logs error if provided object is invalid
  });

  test('if mode is LOCALHOST_MODE and localhostMode object is valid, returns the provided object', () => {
    expect(validateLocalhost({ log, sync: { localhostMode: localhostModeObject }, mode: 'localhost' })).toBe(localhostModeObject);
    expect(log.error).not.toBeCalled();
  });

  test('if mode is not LOCALHOST_MODE, returns the provided object (it is not validated)', () => {
    expect(validateLocalhost({ log, sync: {}, mode: 'standalone' })).toBe(undefined);
    expect(validateLocalhost({ log, sync: { localhostMode: 'INVALID_BUT_IGNORED' }, mode: 'standalone' })).toBe('INVALID_BUT_IGNORED');
    expect(log.error).not.toBeCalled();
  });

});

describe('validateLocalhostWithDefault, for full SplitFactory', () => {

  afterEach(() => {
    log.error.mockClear();
  });

  test('if mode is LOCALHOST_MODE and localhostMode object is not provided, returns default without logging an error', () => {
    expect(validateLocalhostWithDefault({ log, sync: {}, mode: 'localhost' })).toBe(localhostModeObject);
    expect(validateLocalhostWithDefault({ log, sync: { localhostMode: null }, mode: 'localhost' })).toBe(localhostModeObject);
    expect(log.error).not.toBeCalled();
  });

  test('if mode is LOCALHOST_MODE and localhostMode object is invalid, returns default and logs an error', () => {
    expect(validateLocalhostWithDefault({ log, sync: { localhostMode: () => { } }, mode: 'localhost' })).toBe(localhostModeObject);
    expect(log.error).toBeCalledTimes(1); // logs error if provided object is invalid
  });

  test('if mode is LOCALHOST_MODE and localhostMode object is valid, returns the provided object', () => {
    expect(validateLocalhostWithDefault({ log, sync: { localhostMode: localhostModeObject }, mode: 'localhost' })).toBe(localhostModeObject);
    expect(log.error).not.toBeCalled();
  });

  test('if mode is not LOCALHOST_MODE, returns the provided object or the default one. Provided object is not validated and so no errors are logged', () => {
    expect(validateLocalhostWithDefault({ log, sync: {}, mode: 'standalone' })).toBe(localhostModeObject);
    expect(validateLocalhostWithDefault({ log, sync: { localhostMode: 'INVALID_BUT_IGNORED' }, mode: 'standalone' })).toBe('INVALID_BUT_IGNORED');
    expect(log.error).not.toBeCalled();
  });

});
