import { Logger } from '../index';
import { codesDebug } from '../messages/debug';
import { _Map } from '../../utils/lang/maps';

export function DebugLogger() {
  return new Logger({ logLevel: 'DEBUG' }, new _Map(codesDebug));
}
