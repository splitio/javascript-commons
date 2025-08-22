import { OCCUPANCY } from '../constants';
import { isString } from '../../../utils/lang';
import { INotificationMessage, INotificationError } from './types';

/**
 * Parses the `data` JSON string, if exists, of a given SSE error notifications.
 * HTTP errors handled by Ably (e.g., 400 due to invalid token, 401 due to expired token, 500) have the `data` property.
 * Other network and HTTP errors do not have this property.
 *
 * @param error - The error event to parse
 * @returns parsed notification error
 * @throws SyntaxError if `error.data` is an invalid JSON string
 */
export function errorParser(error: Event): INotificationError {
  // @ts-ignore
  if (isString(error.data)) error.parsedData = JSON.parse(error.data); // cannot assign to read only property 'data'

  return error;
}

/**
 * Parses the `data` JSON string of a given SSE message notifications.
 * Also assigns the type OCCUPANCY, if it corresponds, so that all supported messages (e.g., SPLIT_UPDATE, CONTROL) have a type.
 *
 * @param message - The message event to parse
 * @returns parsed notification message or undefined if the given event data is falsy (e.g, '' or undefined).
 * For example, the EventSource implementation of React-Native for iOS emits a message event with empty data for Ably keepalive comments.
 * @throws SyntaxError if `message.data` or `JSON.parse(message.data).data` are invalid JSON strings
 */
export function messageParser(message: MessageEvent): INotificationMessage | undefined {
  if (!message.data) return;
  const messageData = JSON.parse(message.data);
  messageData.parsedData = JSON.parse(messageData.data);

  // set the event type to OCCUPANCY, to handle all events uniformely
  if (messageData.name && messageData.name === '[meta]occupancy')
    messageData.parsedData.type = OCCUPANCY;

  return messageData;
}
