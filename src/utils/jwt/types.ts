export interface IDecodedJWTToken {
  ['x-ably-capability']: string
  exp: number
  iat: number

  /** Unused fields: */
  // orgId?: string,
  // envId?: string,
  // ['x-ably-clientId']?: string,
}
