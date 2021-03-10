import { Logger } from '../index';
import { codesError } from '../codesError';
import { codesWarn } from '../codesWarn';
import { codesInfo } from '../codesInfo';
import { codesDebug } from '../codesDebug';
import { _Map } from '../../utils/lang/maps';

export const debugLogger = new Logger('splitio', { logLevel: 'DEBUG' }, new _Map(codesError.concat(codesWarn).concat(codesInfo).concat(codesDebug)));
