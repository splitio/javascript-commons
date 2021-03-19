import { Logger } from '../index';
import { codesError } from '../messages/error';
import { codesWarn } from '../messages/warn';
import { codesInfo } from '../messages/info';
import { codesDebug } from '../messages/debug';
import { _Map } from '../../utils/lang/maps';

export function DebugLogger() {
  return new Logger({ logLevel: 'DEBUG' }, new _Map(codesError.concat(codesWarn, codesInfo, codesDebug)));
}
