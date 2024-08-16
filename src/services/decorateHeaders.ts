import { objectAssign } from '../utils/lang/objectAssign';
import { _Set } from '../utils/lang/sets';
import { ISettings } from '../types';

const FORBIDDEN_HEADERS = new _Set([
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

function convertKeysToLowerCase(obj: Record<string, string>) {
  return Object.keys(obj).reduce<Record<string, string>>((acc, key) => {
    acc[key.toLowerCase()] = obj[key];
    return acc;
  }, {});
}

export function decorateHeaders(settings: ISettings, headers: Record<string, string>) {
  if (settings.sync.requestOptions?.getHeaderOverrides) {
    headers = convertKeysToLowerCase(headers);
    try {
      const headerOverrides = convertKeysToLowerCase(settings.sync.requestOptions.getHeaderOverrides({ headers: objectAssign({}, headers) }));
      Object.keys(headerOverrides)
        .filter(key => !FORBIDDEN_HEADERS.has(key))
        .forEach(key => headers[key] = headerOverrides[key]);
    } catch (e) {
      settings.log.error('Problem adding custom headers to request decorator: ' + e);
    }
  }
  return headers;
}
