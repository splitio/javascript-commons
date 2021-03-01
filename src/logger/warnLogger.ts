import { Logger } from '.';
import { codesError } from './codesError';
import { codesWarn } from './codesWarn';

const codes = {
  ERROR: codesError,
  WARN: codesWarn,
  INFO: [],
  DEBUG: [],
  NONE: [],
};

export const warnLogger = new Logger(undefined, undefined, codes);
