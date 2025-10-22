import { objectAssign } from '../utils/lang/objectAssign';
import { ILoggerOptions, ILogger } from './types';
import { find, isObject } from '../utils/lang';
import SplitIO from '../../types/splitio';
import { isLogger } from '../utils/settingsValidation/logger/commons';

export const LogLevels: SplitIO.ILoggerAPI['LogLevel'] = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  NONE: 'NONE'
};

const LogLevelIndexes = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  NONE: 5
};

export const DEFAULT_LOGGER: SplitIO.Logger = {
  debug(msg) { console.log('[DEBUG] ' + msg); },
  info(msg) { console.log('[INFO]  ' + msg); },
  warn(msg) { console.log('[WARN]  ' + msg); },
  error(msg) { console.log('[ERROR] ' + msg); }
};

export function isLogLevelString(str: string): str is SplitIO.LogLevel {
  return !!find(LogLevels, (lvl: string) => str === lvl);
}

// exported for testing purposes only
export function _sprintf(format: string = '', args: any[] = []): string {
  let i = 0;
  return format.replace(/%s/g, function () {
    let arg = args[i++];
    if (isObject(arg) || Array.isArray(arg)) {
      try {
        arg = JSON.stringify(arg);
      } catch (e) { /* empty */ }
    }
    return arg;
  });
}

const defaultOptions = {
  prefix: 'splitio',
  logLevel: LogLevels.NONE,
};

export class Logger implements ILogger {

  private options: Required<ILoggerOptions>;
  private codes: Map<number, string>;
  private logLevel: number;
  private logger?: SplitIO.Logger;

  constructor(options?: ILoggerOptions, codes?: Map<number, string>) {
    this.options = objectAssign({}, defaultOptions, options);
    this.codes = codes || new Map();
    this.logLevel = LogLevelIndexes[this.options.logLevel];
  }

  setLogLevel(logLevel: SplitIO.LogLevel) {
    this.options.logLevel = logLevel;
    this.logLevel = LogLevelIndexes[logLevel];
  }

  setLogger(logger?: SplitIO.Logger) {
    if (logger) {
      if (isLogger(logger)) {
        this.logger = logger;
        return;
      } else {
        this.error('Invalid `logger` instance. It must be an object with `debug`, `info`, `warn` and `error` methods. Defaulting to `console.log`');
      }
    }
    // unset
    this.logger = undefined;
  }

  debug(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.DEBUG)) this._log('debug', msg, args);
  }

  info(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.INFO)) this._log('info', msg, args);
  }

  warn(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.WARN)) this._log('warn', msg, args);
  }

  error(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.ERROR)) this._log('error', msg, args);
  }

  _log(method: keyof SplitIO.Logger, msg: string | number, args?: any[]) {
    if (typeof msg === 'number') {
      const format = this.codes.get(msg);
      msg = format ? _sprintf(format, args) : `Message code ${msg}${args ? ', with args: ' + args.toString() : ''}`;
    } else {
      if (args) msg = _sprintf(msg, args);
    }

    if (this.options.prefix) msg = this.options.prefix + ' => ' + msg;

    if (this.logger) {
      try {
        this.logger[method](msg);
        return;
      } catch (e) { /* empty */ }
    }
    DEFAULT_LOGGER[method](msg);
  }

  private _shouldLog(level: number) {
    return level >= this.logLevel;
  }
}
