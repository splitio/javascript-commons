import { ISettings } from '../../types';
import { _decorateHeaders } from '../splitHttpClient';

const HEADERS = {
  'authorization': 'Bearer SDK-KEY',
  'splitsdkversion': 'JS' // Overriding is forbidden
};

describe('_decorateHeaders', () => {

  test('should not decorate headers if getHeaderOverrides is not provided', () => {
    const headers = { ...HEADERS };
    const settings = { sync: {} };

    expect(_decorateHeaders(settings as unknown as ISettings, headers)).toEqual(HEADERS);
  });

  test('should decorate headers with header overrides, ignoring forbidden headers', () => {
    const headers = { ...HEADERS };
    const settings = {
      sync: {
        requestOptions: {
          getHeaderOverrides: (context: { headers: Record<string, string> }) => {
            context.headers['Authorization'] = 'ignored';
            return { 'Authorization': 'updated', 'OTHER_HEADER': 'other_value', 'SplitSdkVersion': 'FORBIDDEN' };
          }
        }
      }
    };

    expect(_decorateHeaders(settings as unknown as ISettings, headers)).toEqual({ 'authorization': 'updated', 'other_header': 'other_value', 'splitsdkversion': 'JS' });
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

    expect(_decorateHeaders(settings as unknown as ISettings, headers)).toEqual(HEADERS);
    expect(settings.log.error).toHaveBeenCalledWith('Problem adding custom headers to request decorator: Error: Unexpected error');
  });
});
