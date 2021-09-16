import { IAuthTokenPushEnabled } from '../AuthClient/types';

export interface ISseEventHandler {
  handleError: (ev: Event) => any;
  handleMessage: (ev: MessageEvent) => any;
  handleOpen: () => any;
}

export interface ISSEClient {
  open(authToken: IAuthTokenPushEnabled): void,
  close(): void,
  setEventHandler(handler: ISseEventHandler): void
}
