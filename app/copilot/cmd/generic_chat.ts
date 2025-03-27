import { GENERIC_CHAT_CONTEXT } from "../context";
import { CMD_BASE } from "./cmd_base";
import { CMD_TYPE } from "./cmd_type";

export interface USR_CHAT_CMD_BASE extends CMD_BASE {
  context: GENERIC_CHAT_CONTEXT;
}

export interface GENERIC_CHAT_CMD extends USR_CHAT_CMD_BASE {
  type: CMD_TYPE.GENERIC_CHAT;
}
