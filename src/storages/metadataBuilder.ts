import { IMetadata } from '../dtos/types';
import { ISettings } from '../types';
import { UNKNOWN } from '../utils/constants';

export function metadataBuilder(settings: Pick<ISettings, 'version' | 'runtime'>): IMetadata {
  return {
    s: settings.version,
    i: settings.runtime.ip || UNKNOWN,
    n: settings.runtime.hostname || UNKNOWN,
  };
}
