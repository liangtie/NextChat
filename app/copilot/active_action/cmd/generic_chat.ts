import { GENERIC_CHAT_CONTEXT } from "../context";
import { CMD_BASE } from "./cmd_base";
import { CMD_TYPE } from "./cmd_type";

export interface GENERIC_CHAT_CMD extends CMD_BASE {
  type: CMD_TYPE.GENERIC_CHAT;
  context: GENERIC_CHAT_CONTEXT;
}
