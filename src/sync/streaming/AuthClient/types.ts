import { IDecodedJWTToken } from '../../../utils/jwt/types';

export interface IAuthTokenPushEnabled {
  pushEnabled: true
  token: string
  decodedToken: IDecodedJWTToken
  channels: { [channel: string]: string[] }
}

export interface IAuthTokenPushDisabled {
  pushEnabled: false
  token: ''
}

export type IAuthToken = IAuthTokenPushDisabled | IAuthTokenPushEnabled

export type IAuthenticate = (userKeys?: string[]) => Promise<IAuthToken>
