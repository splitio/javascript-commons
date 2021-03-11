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

export function isLogLevelString(str: string): str is LogLevel {
  return !!find(LogLevels, (lvl: string) => str === lvl);
}

const defaultOptions = {
  logLevel: LogLevels.NONE,
  showLevel: true,
};

export class Logger implements ILogger {

  private category: string;
  private options: Required<ILoggerOptions>;

  constructor(category: string, options?: ILoggerOptions) {
    this.category = category;
    this.options = objectAssign({}, defaultOptions, options);
  }

  setLogLevel(logLevel: LogLevel) {
    this.options.logLevel = logLevel;
  }

  debug(msg: string) {
    this._log(LogLevels.DEBUG, msg);
  }

  info(msg: string) {
    this._log(LogLevels.INFO, msg);
  }

  warn(msg: string) {
    this._log(LogLevels.WARN, msg);
  }

  error(msg: string) {
    this._log(LogLevels.ERROR, msg);
  }

  _log(level: LogLevel, text: string) {
    if (this._shouldLog(level)) {
      const formattedText = this._generateLogMessage(level, text);

      console.log(formattedText);
    }
  }

  _generateLogMessage(level: LogLevel, text: string) {
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
    const logLevel = this.options.logLevel;
    const levels = Object.keys(LogLevels).map((f) => LogLevels[f as keyof typeof LogLevels]);
    const index = levels.indexOf(level); // What's the index of what it's trying to check if it should log
    const levelIdx = levels.indexOf(logLevel); // What's the current log level index.

    return index >= levelIdx;
  }
}
