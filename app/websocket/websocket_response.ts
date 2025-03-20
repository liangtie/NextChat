export interface AgentCMD {
  action: string;
  context?: unknown;
}

export enum WEBSOCKET_RESPONSE_TYPE {
  CHAT_STREAMING = 1,
  CHAT_END = 2,
  DEBUG = 5,
  AGENT = 6,
}

export interface WEBSOCKET_CHAT_RESPONSE {
  type: WEBSOCKET_RESPONSE_TYPE;
  msg: string;
}

export interface WEBSOCKET_AGENT_RESPONSE extends AgentCMD {
  type: WEBSOCKET_RESPONSE_TYPE.AGENT;
}
