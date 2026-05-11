import { IJwtCredentialV3 } from '../../sync/streaming/AuthClient/types';

function toBase64Url(str: string) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function makeJwtCredential(expInSeconds = 3600): IJwtCredentialV3 {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'HS256' }));
  const decodedToken = { iat: now, exp: now + expInSeconds, 'x-ably-capability': '{"ch":["subscribe"]}' };
  const payload = toBase64Url(JSON.stringify(decodedToken));

  return {
    token: `${header}.${payload}.sig`,
    decodedToken,
    channels: { ch: ['subscribe'] },
    config: {
      streaming: {
        enabled: true,
        delay: 60,
      }
    }
  };
}
