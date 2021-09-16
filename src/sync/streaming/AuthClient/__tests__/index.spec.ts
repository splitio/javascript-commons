// mocks and dependencies
import { splitApiFactory } from '../../../../services/splitApi';
import { authDataResponseSample, authDataSample, jwtSampleInvalid, jwtSampleNoChannels, jwtSampleNoIat, userKeySample, userKeyBase64HashSample } from '../../__tests__/dataMocks';
import fetchMock from '../../../../__tests__/testUtils/fetchMock';
import { settingsSplitApi } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import EventEmitter from '../../../../utils/MinEvents';

// module to test
import { authenticateFactory, hashUserKey } from '../index';

const authorizationKey = settingsSplitApi.core.authorizationKey;
const authUrl = settingsSplitApi.urls.auth; // @ts-ignore
const splitApi = splitApiFactory(settingsSplitApi, { getFetch: () => fetchMock, EventEmitter });
const authenticate = authenticateFactory(splitApi.fetchAuth);

test('hashUserKey', () => {

  expect(hashUserKey(userKeySample)).toBe(userKeyBase64HashSample); // hashes key and encodes to base64

});

test('authenticate / success in node (200)', done => {

  fetchMock.getOnce(authUrl + '/v2/auth', (url, opts) => {
    // @ts-ignore
    expect(opts.headers['Authorization']).toBe(`Bearer ${authorizationKey}`); // auth request must contain Authorization header with config authorizationKey
    return { status: 200, body: authDataResponseSample };
  });

  authenticate().then(data => {
    expect(data).toEqual(authDataSample); // if success, authorization must return data with token and decoded token
    done();
  }).catch(error => {
    throw new Error(error);
  });

});

test('authenticate / success in browser (200)', done => {

  const userKeys = ['emi@split.io', 'maldo@split.io'];

  fetchMock.getOnce(authUrl + '/v2/auth?users=emi%40split.io&users=maldo%40split.io', (url, opts) => {
    // @ts-ignore
    expect(opts.headers['Authorization']).toBe(`Bearer ${authorizationKey}`); // auth request must contain Authorization header with config authorizationKey
    return { status: 200, body: authDataResponseSample };
  });

  authenticate(userKeys).then(data => {
    expect(data).toEqual(authDataSample); // if success, authorization must return data with token and decoded token
    done();
  }).catch(error => {
    throw new Error(error);
  });

});

test('authenticate / bad request in browser due to no user keys (400)', done => {

  fetchMock.getOnce(authUrl + '/v2/auth', { status: 400, body: '"no user specified"' });

  authenticate([]).then(() => {
    throw new Error('if bad request, promise is rejected');
  }).catch(error => {
    expect(error.statusCode).toBe(400); // if bad request, status code is 400
    done();
  });

});

test('authenticate / Invalid credentials (401)', done => {

  fetchMock.getOnce(authUrl + '/v2/auth', { status: 401, body: '"Invalid credentials"' });

  authenticate([]).then(() => {
    throw new Error('if invalid credential, promise should be rejected');
  }).catch(error => {
    expect(error.statusCode).toBe(401); // if invalid credential, status code is 401
    done();
  });

});

test('authenticate / HTTP error (other than 401)', done => {

  const NOT_OK_STATUS_CODE = 500;

  fetchMock.getOnce(authUrl + '/v2/auth', { status: NOT_OK_STATUS_CODE, body: 'some error message' });

  authenticate([]).then(() => {
    throw new Error('if an HTTP error, promise is rejected');
  }).catch(error => {
    expect(error.statusCode).toBe(NOT_OK_STATUS_CODE); // if an HTTP error, status code is the HTTP status code
    done();
  });

});

test('authenticate / Network error (e.g., timeout)', done => {

  fetchMock.getOnce(authUrl + '/v2/auth', { throws: new TypeError('Network error') });

  authenticate([]).then(() => {
    throw new Error('if network error, promise is rejected');
  }).catch(error => {
    expect(error.statusCode).toBe(undefined); // if network error, status code is `undefined`
    done();
  });

});

test('authenticate / Error parsing token', done => {

  fetchMock.getOnce(authUrl + '/v2/auth', { status: 200, body: { pushEnabled: true, token: jwtSampleInvalid } });
  fetchMock.getOnce(authUrl + '/v2/auth', { status: 200, body: { pushEnabled: true, token: jwtSampleNoChannels } });
  fetchMock.getOnce(authUrl + '/v2/auth', { status: 200, body: { pushEnabled: true, token: jwtSampleNoIat } });

  authenticate().then(() => {
    throw new Error('if invalid token, promise is rejected');
  }).catch(() => {

    authenticate().then(() => {
      throw new Error('if invalid token, promise is rejected');
    }).catch(() => {

      authenticate().then(() => {
        throw new Error('if invalid token, promise is rejected');
      }).catch(() => {
        done();
      });
    });
  });

});
