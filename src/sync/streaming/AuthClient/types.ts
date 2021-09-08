import { IDecodedJWTToken } from '../../../utils/jwt/types';

export interface IAuthTokenPushEnabled {
  pushEnabled: true
  token: string
  decodedToken: IDecodedJWTToken
  channels: { [channel: string]: string[] }
  connDelay?: number
}

export interface IAuthTokenPushDisabled {
  pushEnabled: false
  token: ''
}

export type IAuthToken = IAuthTokenPushDisabled | IAuthTokenPushEnabled

export type IAuthenticate = (userKeys?: string[]) => Promise<IAuthToken>

export type IAuthenticateV2 = (isClientSide?: boolean) => Promise<IAuthToken>
