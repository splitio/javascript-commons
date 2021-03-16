import { Logger } from '../index';
import { codesError } from '../messages/error';
import { codesWarn } from '../messages/warn';
import { codesInfo } from '../messages/info';
import { _Map } from '../../utils/lang/maps';

export const infoLogger = new Logger(
  'splitio', { logLevel: 'INFO' },
  new _Map(codesError.concat(codesWarn, codesInfo))
);
