import { IJwtCredential } from '../AuthClient/types';

export interface ISseEventHandler {
  handleError: (ev: Event) => any;
  handleMessage: (ev: MessageEvent) => any;
  handleOpen: () => any;
}

export interface ISSEClient {
  open(authToken: IJwtCredential): void,
  close(): void,
  setEventHandler(handler: ISseEventHandler): void
}
