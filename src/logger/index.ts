import objectAssign from 'object-assign';
import { ILoggerOptions, ILogger, ICodes } from './types';
import { find } from '../utils/lang';
import { LogLevel } from '../types';

export const LogLevels: { [level in LogLevel]: LogLevel } = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  NONE: 'NONE'
};

// DEBUG is the default. The log level is not specific to an SDK instance.
let globalLogLevel = LogLevels.DEBUG;

export function setLogLevel(level: LogLevel) {
  globalLogLevel = level;
}

export function isLogLevelString(str: string): str is LogLevel {
  return !!find(LogLevels, (lvl: string) => str === lvl);
}

function sprintf(format: string = '', args: any[] = []): string {
  var i = 0;
  return format.replace(/%s/g, function () {
    return args[i++];
  });
}

const defaultOptions = {
  showLevel: true,
  displayAllErrors: false
};

export class Logger implements ILogger {

  private category?: string;
  private options: ILoggerOptions;
  private codes: ICodes;

  constructor(category: string | undefined, options: ILoggerOptions | undefined, codes: ICodes) {
    this.category = category;
    this.options = objectAssign({}, defaultOptions, options);
    this.codes = codes;
  }

  debug(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevels.DEBUG))
      this._log(LogLevels.DEBUG, msg, args);
  }

  info(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevels.INFO))
      this._log(LogLevels.INFO, msg, args);
  }

  warn(msg: string | number, args?: any[]) {
    if (this._shouldLog(LogLevels.WARN))
      this._log(LogLevels.WARN, msg, args);
  }

  error(msg: string | number, args?: any[]) {
    if (this.options.displayAllErrors || this._shouldLog(LogLevels.ERROR))
      this._log(LogLevels.ERROR, msg, args);
  }

  private _log(level: LogLevel, text: string | number, args?: any[]) {
    if (typeof text === 'number') text = sprintf(this.codes[level][text], args);
    const formattedText = this._generateLogMessage(level, text);

    console.log(formattedText);
  }

  private _generateLogMessage(level: string, text: string) {
    const textPre = ' => ';
    let result = '';

    if (this.options.showLevel) {
      result += '[' + level + ']' + (level === LogLevels.INFO || level === LogLevels.WARN ? ' ' : '') + ' ';
    }

    if (this.category) {
      result += this.category + textPre;
    }

    return result += text;
  }

  private _shouldLog(level: LogLevel) {
    const logLevel = globalLogLevel;
    const levels = Object.keys(LogLevels).map((f) => LogLevels[f as keyof typeof LogLevels]);
    const index = levels.indexOf(level); // What's the index of what it's trying to check if it should log
    const levelIdx = levels.indexOf(logLevel); // What's the current log level index.

    return index >= levelIdx;
  }
}
