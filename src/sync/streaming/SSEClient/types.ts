import { IAuthTokenPushEnabled } from '../AuthClient/types';

export interface ISseEventHandler {
  handleError: (ev: Event) => any;
  handleMessage: (ev: MessageEvent) => any;
  handleOpen: () => any;
  handleClose: () => any;
}

export interface ISSEClient {
  open(authToken: IAuthTokenPushEnabled): void,
  reopen(): void,
  close(): void,
  setEventHandler(handler: ISseEventHandler): void
}
