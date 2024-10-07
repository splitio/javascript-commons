import { Logger } from '../index';
import { codesInfo } from '../messages/info';

export function InfoLogger() {
  return new Logger({ logLevel: 'INFO' }, new Map(codesInfo));
}
