import { Logger } from '../index';
import { codesError } from '../messages/error';
import { codesWarn } from '../messages/warn';
import { codesInfo } from '../messages/info';
import { codesDebug } from '../messages/debug';
import { codesDebugBrowser } from '../messages/debugBrowser';
import { _Map } from '../../utils/lang/maps';

export const debugLogger = new Logger(
  'splitio', { logLevel: 'DEBUG' },
  new _Map(codesError.concat(codesWarn, codesInfo, codesDebug, codesDebugBrowser))
);
