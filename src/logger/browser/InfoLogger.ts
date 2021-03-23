import { Logger } from '../index';
import { codesInfo } from '../messages/info';
import { _Map } from '../../utils/lang/maps';

export function InfoLogger() {
  return new Logger({ logLevel: 'INFO' }, new _Map(codesInfo));
}
