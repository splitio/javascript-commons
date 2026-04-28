import { EventEmitter } from '../utils/EventEmitter';
import { getFetch } from '../platform/getFetch/browser';
import { getEventSource } from '../platform/getEventSource/browser';
import { BrowserSignalListener } from '../listeners/browser';
import { now } from '../utils/timeTracker/now/browser';
import { IPlatform } from '../sdkFactory/types';

export const platform: IPlatform = {
  getFetch,
  getEventSource,
  EventEmitter,
  now,
  SignalListener: BrowserSignalListener as IPlatform['SignalListener']
};
