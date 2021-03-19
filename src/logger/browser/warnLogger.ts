import { Logger } from '../index';
import { codesError } from '../messages/error';
import { codesWarn } from '../messages/warn';
import { _Map } from '../../utils/lang/maps';

export const warnLogger = new Logger(
  { logLevel: 'WARN' },
  new _Map(codesError.concat(codesWarn))
);
