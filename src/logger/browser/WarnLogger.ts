import { Logger } from '../index';
import { codesWarn } from '../messages/warn';

export function WarnLogger() {
  return new Logger({ logLevel: 'WARN' }, new Map(codesWarn));
}
