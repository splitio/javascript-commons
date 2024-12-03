import { objectAssign } from '../utils/lang/objectAssign';
import { ISettings } from '../types';

const FORBIDDEN_HEADERS = new Set([
  'splitsdkclientkey',
  'splitsdkversion',
  'splitsdkmachineip',
  'splitsdkmachinename',
  'splitsdkimpressionsmode',
  'host',
  'referrer',
  'content-type',
  'content-length',
  'content-encoding',
  'accept',
  'keep-alive',
  'x-fastly-debug'
]);

export function decorateHeaders(settings: ISettings, headers: Record<string, string>) {
  if (settings.sync.requestOptions?.getHeaderOverrides) {
    try {
      const headerOverrides = settings.sync.requestOptions.getHeaderOverrides({ headers: objectAssign({}, headers) });
      Object.keys(headerOverrides)
        .filter(key => !FORBIDDEN_HEADERS.has(key.toLowerCase()))
        .forEach(key => headers[key] = headerOverrides[key]);
    } catch (e) {
      settings.log.error('Problem adding custom headers to request decorator: ' + e);
    }
  }
  return headers;
}

export function removeNonISO88591(input: string) {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[^\x00-\xFF]/g, '');
}
