import { Logger } from '.';
import { codesError } from './codesError';
import { codesInfo } from './codesInfo';
import { codesWarn } from './codesWarn';

const codes = {
  ERROR: codesError,
  WARN: codesWarn,
  INFO: codesInfo,
  DEBUG: [],
  NONE: [],
};

export const infoLogger = new Logger(undefined, undefined, codes);
