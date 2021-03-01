import { Logger } from '.';
import { codesDebug } from './codesDebug';
import { codesError } from './codesError';
import { codesInfo } from './codesInfo';
import { codesWarn } from './codesWarn';

const codes = {
  ERROR: codesError,
  WARN: codesWarn,
  INFO: codesInfo,
  DEBUG: codesDebug,
  NONE: [],
};

export const debugLogger = new Logger(undefined, undefined, codes);
