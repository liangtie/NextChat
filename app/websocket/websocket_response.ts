export interface AgentCMD {
  action: string;
  context?: unknown;
}

export enum WEBSOCKET_MESSAGE_TYPE {
  STREAMING = 1,
  STOPPED = 2,
  DEBUG = 5,
  AGENT = 6,
}

export interface WEBSOCKET_RESPONSE {
  type: WEBSOCKET_MESSAGE_TYPE;
  msg: string;
}

export interface WEBSOCKET_AGENT_RESPONSE extends AgentCMD {
  type: WEBSOCKET_MESSAGE_TYPE.AGENT;
}
