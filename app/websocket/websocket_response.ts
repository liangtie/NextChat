export enum WEBSOCKET_RESPONSE_TYPE {
  CHAT_STREAMING = 1,
  CHAT_STREAMING_END = 2,
  DEBUG = 5,
  AGENT = 6,
}

export interface WEBSOCKET_STREAMING_RESPONSE {
  type:
    | WEBSOCKET_RESPONSE_TYPE.CHAT_STREAMING
    | WEBSOCKET_RESPONSE_TYPE.CHAT_STREAMING_END;
  msg: string;
}

export interface WEBSOCKET_DEBUG_RESPONSE {
  type: WEBSOCKET_RESPONSE_TYPE.DEBUG;
  msg: string;
}

/**
 * Function call replied by the AI, used to involve a rpc call or launch python/js script
 */
export interface AGENT_REQUEST {
  action: string;
  context?: unknown;
}

export interface WEBSOCKET_AGENT_RESPONSE extends AGENT_REQUEST {
  type: WEBSOCKET_RESPONSE_TYPE.AGENT;
}

export type WEBSOCKET_RESPONSE =
  | WEBSOCKET_STREAMING_RESPONSE
  | WEBSOCKET_DEBUG_RESPONSE
  | WEBSOCKET_AGENT_RESPONSE;
