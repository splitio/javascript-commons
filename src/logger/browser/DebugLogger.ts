import { Logger } from '../index';
import { codesDebug } from '../messages/debug';

export function DebugLogger() {
  return new Logger({ logLevel: 'DEBUG' }, new Map(codesDebug));
}
