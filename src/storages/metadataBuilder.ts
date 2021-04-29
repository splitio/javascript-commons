import { IMetadata, IRedisMetadata } from '../dtos/types';
import { UNKNOWN } from '../utils/constants';

export function metadataBuilder(metadata: IMetadata): IRedisMetadata {
  return {
    s: metadata.version,
    i: metadata.ip || UNKNOWN,
    n: metadata.hostname || UNKNOWN,
  };
}
