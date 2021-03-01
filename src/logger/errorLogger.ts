import { Logger } from '.';
import { codesError } from './codesError';

const codes = {
  ERROR: codesError,
  WARN: [],
  INFO: [],
  DEBUG: [],
  NONE: [],
};

export const errorLogger = new Logger(undefined, undefined, codes);
