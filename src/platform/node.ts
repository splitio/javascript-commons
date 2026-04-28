import { EventEmitter } from 'events';
import { getFetch } from '../platform/getFetch/node';
import { getEventSource } from '../platform/getEventSource/node';
import { getOptions } from '../platform/getOptions/node';
import { NodeSignalListener } from '../listeners/node';
import { now } from '../utils/timeTracker/now/node';
import { IPlatform } from '../sdkFactory/types';

export const platform: IPlatform = {
  getFetch,
  getEventSource,
  getOptions,
  EventEmitter,
  now,
  SignalListener: NodeSignalListener
};
