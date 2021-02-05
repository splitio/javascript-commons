/* eslint-disable no-use-before-define */
/**
 * EventSource mock based on https://github.com/gcedo/eventsourcemock/blob/master/src/EventSource.js
 *
 * To setup the mock assign it to the window object.
 * ```
 *  import EventSource from 'eventsourcemock';
 *  Object.defineProperty(window, 'EventSource', {
 *    value: EventSource,
 *  });
 * ```
 *
 */

import EventEmitter from '../../utils/MinEvents';
import { IEventEmitter } from '../../types';

type ReadyStateType = 0 | 1 | 2;

interface EventSourceInitDict {
  withCredentials?: boolean;
  headers?: object;
  proxy?: string;
  https?: object;
  rejectUnauthorized?: boolean;
}

interface EventListener {
  (evt: Event): void;
}

const defaultOptions = {
  withCredentials: false
};

export const sources: { [key: string]: EventSource } = {};

let __listener: (eventSource: EventSource) => void;

export function setMockListener(listener: (eventSource: EventSource) => void) {
  __listener = listener;
}

export default class EventSource {
  static readonly CONNECTING: ReadyStateType = 0;
  static readonly OPEN: ReadyStateType = 1;
  static readonly CLOSED: ReadyStateType = 2;

  private readonly __emitter: IEventEmitter;
  onerror?: (evt: MessageEvent) => any;;
  onmessage?: (evt: MessageEvent) => any;
  onopen?: (evt?: MessageEvent) => any;
  readyState: ReadyStateType;
  url: string;
  withCredentials?: boolean;

  constructor(
    url: string,
    configuration: EventSourceInitDict = defaultOptions
  ) {
    this.url = url;
    this.withCredentials = configuration.withCredentials;
    this.readyState = 0;
    // @ts-ignore
    this.__emitter = new EventEmitter();
    sources[url] = this;
    if (__listener) setTimeout(__listener, 0, this);
  }

  addEventListener(eventName: string, listener: EventListener) {
    this.__emitter.addListener(eventName, listener);
  }

  removeEventListener(eventName: string, listener: EventListener) {
    this.__emitter.removeListener(eventName, listener);
  }

  close() {
    this.readyState = 2;
  }

  emit(eventName: string, messageEvent?: MessageEvent) {
    this.__emitter.emit(eventName, messageEvent);
  }

  emitError(error: MessageEvent) {
    if (typeof this.onerror === 'function') {
      this.onerror(error);
    }
  }

  emitOpen() {
    this.readyState = 1;
    if (typeof this.onopen === 'function') {
      this.onopen();
    }
  }

  emitMessage(message: MessageEvent) {
    if (typeof this.onmessage === 'function') {
      this.onmessage(message);
    }
  }
}
