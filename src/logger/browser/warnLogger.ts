import { Logger } from '../index';
import { codesError } from '../codesError';
import { codesWarn } from '../codesWarn';
import { _Map } from '../../utils/lang/maps';

export const warnLogger = new Logger('splitio', { logLevel: 'WARN' }, new _Map(codesError.concat(codesWarn)));
