import { ISettings } from '../../types';
import { _decorateHeaders } from '../splitHttpClient';

const HEADERS = {
  'Authorization': 'Bearer SDK-KEY',
  'SplitSdkVersion': 'JS' // Overriding is forbidden
};

describe('_decorateHeaders', () => {

  test('should not decorate headers if getHeaderOverrides is not provided', () => {
    const headers = { ...HEADERS };
    const settings = { sync: {} };

    _decorateHeaders(settings as unknown as ISettings, headers);

    expect(headers).toEqual(HEADERS);
  });

  test('should decorate headers with header overrides, ignoring forbidden headers', () => {
    const headers = { ...HEADERS };
    const settings = {
      sync: {
        requestOptions: {
          getHeaderOverrides: (context: { headers: Record<string, string> }) => {
            context.headers['Authorization'] = 'ignored';
            return { 'Authorization': 'updated', 'other_header': 'other_value', 'SplitSdkVersion': 'FORBIDDEN' };
          }
        }
      }
    };

    _decorateHeaders(settings as unknown as ISettings, headers);

    expect(headers).toEqual({ 'Authorization': 'updated', 'other_header': 'other_value', 'SplitSdkVersion': 'JS' });
  });

  test('should handle errors when decorating headers', () => {
    const headers = { ...HEADERS };
    const settings = {
      sync: {
        requestOptions: {
          getHeaderOverrides: () => {
            throw new Error('Unexpected error');
          }
        }
      },
      log: { error: jest.fn() }
    };

    _decorateHeaders(settings as unknown as ISettings, headers);

    expect(settings.log.error).toHaveBeenCalledWith('Problem adding custom headers to request decorator: Error: Unexpected error');
    expect(headers).toEqual(HEADERS);
  });
});
