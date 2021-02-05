import { IMetadata } from '../../dtos/types';
import { ISettings } from '../../types';

export default function buildMetadata(settings: ISettings): IMetadata {
  const { version, runtime } = settings;
  return {
    version,
    ip: runtime && runtime.ip,
    hostname: runtime && runtime.hostname,
  };
}
