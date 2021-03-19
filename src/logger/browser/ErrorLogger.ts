import { Logger } from '../index';
import { codesError } from '../messages/error';
import { _Map } from '../../utils/lang/maps';

export function ErrorLogger() {
  return new Logger({ logLevel: 'ERROR' }, new _Map(codesError));
}
