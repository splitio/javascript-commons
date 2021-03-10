import { Logger } from '../index';
import { codesError } from '../codesError';
import { codesWarn } from '../codesWarn';
import { codesInfo } from '../codesInfo';
import { _Map } from '../../utils/lang/maps';

export const infoLogger = new Logger('splitio', { logLevel: 'INFO' }, new _Map(codesError.concat(codesWarn).concat(codesInfo)));
