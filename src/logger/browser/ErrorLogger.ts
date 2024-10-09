import { Logger } from '../index';
import { codesError } from '../messages/error';

export function ErrorLogger() {
  return new Logger({ logLevel: 'ERROR' }, new Map(codesError));
}
