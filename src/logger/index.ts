import { objectAssign } from '../utils/lang/objectAssign';
import { ILoggerOptions, ILogger } from './types';
import { find, isObject } from '../utils/lang';
import SplitIO from '../../types/splitio';

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

const levelToMethod: Record<Exclude<SplitIO.LogLevel, 'NONE'>, keyof typeof console> = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
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
  showLevel: true,
};

export class Logger implements ILogger {

  private options: Required<ILoggerOptions>;
  private codes: Map<number, string>;
  private logLevel: number;

  constructor(options?: ILoggerOptions, codes?: Map<number, string>) {
    this.options = objectAssign({}, defaultOptions, options);
    this.codes = codes || new Map();
    this.logLevel = LogLevelIndexes[this.options.logLevel];
  }

  setLogLevel(logLevel: SplitIO.LogLevel) {
    this.options.logLevel = logLevel;
    this.logLevel = LogLevelIndexes[logLevel];
  }

  debug(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.DEBUG)) this._log(LogLevels.DEBUG, msg, args);
  }

  info(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.INFO)) this._log(LogLevels.INFO, msg, args);
  }

  warn(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.WARN)) this._log(LogLevels.WARN, msg, args);
  }

  error(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevelIndexes.ERROR)) this._log(LogLevels.ERROR, msg, args);
  }

  private _log(level: SplitIO.LogLevel, msg: string | number, args?: any[]) {
    if (typeof msg === 'number') {
      const format = this.codes.get(msg);
      msg = format ? _sprintf(format, args) : `Message code ${msg}${args ? ', with args: ' + args.toString() : ''}`;
    } else {
      if (args) msg = _sprintf(msg, args);
    }

    const formattedText = this._generateLogMessage(level, msg);

    const method = levelToMethod[level as Exclude<SplitIO.LogLevel, 'NONE'>];

    const fn = typeof console[method] === 'function' ? (console as any)[method] : console.log;

    fn(formattedText);
  }

  private _generateLogMessage(level: SplitIO.LogLevel, text: string) {
    const textPre = ' => ';
    let result = '';

    if (this.options.showLevel) {
      result += '[' + level + ']' + (level === LogLevels.INFO || level === LogLevels.WARN ? ' ' : '') + ' ';
    }

    if (this.options.prefix) {
      result += this.options.prefix + textPre;
    }

    return result += text;
  }

  private _shouldLog(level: number) {
    return level >= this.logLevel;
  }
}
