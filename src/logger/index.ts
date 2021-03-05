import objectAssign from 'object-assign';
import { ILoggerOptions, ILogger } from './types';
import { find } from '../utils/lang';
import { LogLevel } from '../types';

export const LogLevels: { [level: string]: LogLevel } = {
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

const defaultOptions = {
  showLevel: true,
};

export class Logger implements ILogger {
  private category: string;
  private options: Required<ILoggerOptions>;

  constructor(category: string, options: ILoggerOptions) {
    this.category = category;
    this.options = objectAssign({}, defaultOptions, options);
  }

  debug(msg: string) {
    if (this._shouldLog(LogLevels.DEBUG))
      this._log(LogLevels.DEBUG, msg);
  }

  info(msg: string) {
    if (this._shouldLog(LogLevels.INFO))
      this._log(LogLevels.INFO, msg);
  }

  warn(msg: string) {
    if (this._shouldLog(LogLevels.WARN))
      this._log(LogLevels.WARN, msg);
  }

  error(msg: string) {
    if (this._shouldLog(LogLevels.ERROR))
      this._log(LogLevels.ERROR, msg);
  }

  _log(level: string, text: string) {
    const formattedText = this._generateLogMessage(level, text);

    console.log(formattedText);
  }

  _generateLogMessage(level: string, text: string) {
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

  _shouldLog(level: LogLevel) {
    const logLevel = globalLogLevel;
    const levels = Object.keys(LogLevels).map((f) => LogLevels[f as keyof typeof LogLevels]);
    const index = levels.indexOf(level); // What's the index of what it's trying to check if it should log
    const levelIdx = levels.indexOf(logLevel); // What's the current log level index.

    return index >= levelIdx;
  }
}
