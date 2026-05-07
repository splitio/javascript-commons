import { IDecodedJWTToken } from '../../../utils/jwt/types';

export type IJwtCredential = {
  pushEnabled: boolean
  token: string
  decodedToken: IDecodedJWTToken
  channels: { [channel: string]: string[] }
  connDelay?: number
  expiresAt: number // epoch seconds
}

export type IAuthenticate = (userKeys?: string[]) => Promise<IJwtCredential>

export type IAuthenticateV2 = (isClientSide?: boolean) => Promise<IJwtCredential>
