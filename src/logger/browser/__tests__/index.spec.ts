import { getLoggerLogLevel } from '../../__tests__/sdkLogger.mock';
import { DebugLogger } from '../DebugLogger';
import { InfoLogger } from '../InfoLogger';
import { WarnLogger } from '../WarnLogger';
import { ErrorLogger } from '../ErrorLogger';

test('DebugLogger', () => {
  expect(getLoggerLogLevel(DebugLogger())).toBe('DEBUG');
});

test('InfoLogger', () => {
  expect(getLoggerLogLevel(InfoLogger())).toBe('INFO');
});

test('WarnLogger', () => {
  expect(getLoggerLogLevel(WarnLogger())).toBe('WARN');
});

test('ErrorLogger', () => {
  expect(getLoggerLogLevel(ErrorLogger())).toBe('ERROR');
});
