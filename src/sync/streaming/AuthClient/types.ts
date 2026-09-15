import { IDecodedJWTToken } from '../../../utils/jwt/types';

export type IJwtCredential = {
  token: string; // empty string ("") when `"pushEnabled": false`
  decodedToken: IDecodedJWTToken
  channels: { [channel: string]: string[] }
  // /api/v2/auth fields
  pushEnabled?: boolean | null;
  connDelay?: number | null;
  // /api/v3/auth fields
  config?: {
    streaming?: {
      delay?: number | null;
      enabled?: boolean | null;
    } | null;
  } | null;
}

export type IAuthenticate = (userKeys?: string[]) => Promise<IJwtCredential>
