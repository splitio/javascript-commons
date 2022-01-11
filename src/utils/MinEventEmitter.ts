
import { IEventEmitter } from '../types';

const NEW_LISTENER_EVENT = 'newListener';
const REMOVE_LISTENER_EVENT = 'removeListener';

function checkListener(listener: unknown) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

// @TODO implement missing methods, check spec and add UTs
export class EventEmitter implements IEventEmitter {

  private listeners: Record<string, Array<[
    (...args: any[]) => void, // the event listener
    boolean // whether it is a one-time listener or not
  ]>> = {};

  private registerListener(type: string, listener: (...args: any[]) => void, oneTime: boolean) {
    checkListener(listener);

    // To avoid recursion in the case that type === "newListener" before
    // adding it to the listeners, first emit "newListener".
    this.emit(NEW_LISTENER_EVENT, type, listener);

    if (!this.listeners[type]) {
      this.listeners[type] = [[listener, oneTime]];
    } else {
      this.listeners[type].push([listener, oneTime]);
    }
    return this;
  }

  addListener(type: string, listener: (...args: any[]) => void) {
    return this.registerListener(type, listener, false);
  }

  // alias of addListener
  on(type: string, listener: (...args: any[]) => void) {
    return this.addListener(type, listener);
  }

  once(type: string, listener: (...args: any[]) => void) {
    return this.registerListener(type, listener, true);
  }

  // @ts-ignore
  removeListener(/* type: string, listener: (...args: any[]) => void */) {
    throw new Error('Method not implemented.');
  }

  // @ts-ignore alias of removeListener
  off(/* type: string, listener: (...args: any[]) => void */) {
    return this.removeListener(/* type, listener */);
  }

  emit(type: string, ...args: any[]): boolean {
    // Returns false if the event doesn't have listeners
    if (!this.listeners[type] || this.listeners[type].length === 0) return false;

    // Call listeners while removing one-time listeners
    this.listeners[type] = this.listeners[type].filter(listenerEntry => {
      listenerEntry[0](...args);
      return !listenerEntry[1];
    });
    return true;
  }

  removeAllListeners(type?: string) {
    if (!this.listeners[REMOVE_LISTENER_EVENT]) {
      // if not listening for `removeListener`, no need to emit
      if (type) {
        if (this.listeners[type]) delete this.listeners[type];
      } else {
        this.listeners = {};
      }
    } else {
      // emit `removeListener` for all listeners
      if (type) {
        const listeners = this.listeners[type];
        if (listeners) {
          // LIFO order
          for (let i = listeners.length - 1; i >= 0; i--) {
            this.emit(REMOVE_LISTENER_EVENT, type, listeners[i]);
          }
          delete this.listeners[type];
        }
      } else {
        const keys = Object.keys(this.listeners);
        for (let i = 0; i < keys.length; ++i) {
          const key = keys[i];
          if (key === REMOVE_LISTENER_EVENT) continue;
          this.removeAllListeners(key);
        }
        this.listeners = {};
      }
    }

    return this;
  }
}
