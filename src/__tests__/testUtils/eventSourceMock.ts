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
  private readonly __eventSourceInitDict: EventSourceInitDict;
  onerror?: (evt: MessageEvent) => any;
  onmessage?: (evt: MessageEvent) => any;
  onopen?: (evt?: MessageEvent) => any;
  readyState: ReadyStateType;
  url: string;
  withCredentials?: boolean;

  constructor(
    url: string,
    eventSourceInitDict: EventSourceInitDict = defaultOptions
  ) {
    this.url = url;
    this.withCredentials = eventSourceInitDict.withCredentials;
    this.readyState = 0;
    // @ts-ignore
    this.__emitter = new EventEmitter();
    this.__eventSourceInitDict = arguments[1];
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

    let listener: ((evt: any) => any) | undefined;
    switch (eventName) {
      case 'error': listener = this.onerror; break;
      case 'open': listener = this.onopen; break;
      case 'message': listener = this.onmessage; break;
    }
    if (typeof listener === 'function') {
      listener(messageEvent);
    }
  }

  emitError(error: MessageEvent) {
    this.emit('error', error);
  }

  emitOpen() {
    this.readyState = 1;
    this.emit('open');
  }

  emitMessage(message: MessageEvent) {
    this.emit('message', message);
  }
}
