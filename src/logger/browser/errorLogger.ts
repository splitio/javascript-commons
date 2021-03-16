import { Logger } from '../index';
import { codesError } from '../messages/error';
import { _Map } from '../../utils/lang/maps';

export const errorLogger = new Logger(
  'splitio', { logLevel: 'ERROR' },
  new _Map(codesError)
);
