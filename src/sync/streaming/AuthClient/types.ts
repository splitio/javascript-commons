import { IDecodedJWTToken } from '../../../utils/jwt/types';

export type IJwtCredentialV2 = {
  pushEnabled: boolean
  token: string // empty string ("") when `"pushEnabled": false`
  decodedToken: IDecodedJWTToken
  channels: { [channel: string]: string[] }
  connDelay?: number
}

export type IJwtCredentialV3 = {
  token: string
  decodedToken: IDecodedJWTToken
  channels: { [channel: string]: string[] }
  config?: {
    streaming?: {
      delay?: number
      enabled?: boolean
    } | null;
  } | null;
}

export type IAuthenticate = (userKeys?: string[]) => Promise<IJwtCredentialV2>
