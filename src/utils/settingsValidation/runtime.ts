import { ISettings } from '../../types';

// For client-side SDKs, machine IP and Hostname are not captured and sent to Split backend.
export function validateRuntime(): ISettings['runtime'] {
  return {
    ip: false,
    hostname: false
  };
}
