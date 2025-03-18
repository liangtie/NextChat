export enum WEBSOCKET_MESSAGE_TYPE {
  STREAMING = 1,
  STOPPED = 2,
  PROMPT = 5,
}

export interface WEBSOCKET_RESPONSE {
  msg: string;
  type: WEBSOCKET_MESSAGE_TYPE;
}
