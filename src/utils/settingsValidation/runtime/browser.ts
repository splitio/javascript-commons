import { ISettings } from '../../../types';

export function validateRuntime(): ISettings['runtime'] {
  return {
    ip: false,
    hostname: false
  };
}
