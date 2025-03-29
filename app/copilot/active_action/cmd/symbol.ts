import { GENERIC_CHAT_CONTEXT, SYMBOL_CMD_CONTEXT } from "../context";
import { CMD_BASE } from "./cmd_base";
import { CMD_TYPE, SYMBOL_CMD_TYPE } from "./cmd_type";

export interface SYMBOL_CMD extends CMD_BASE {
  type: SYMBOL_CMD_TYPE;
  context: SYMBOL_CMD_CONTEXT;
}

export interface USR_CHAT_WITH_COMPONENT_CMD extends CMD_BASE {
  type: CMD_TYPE.USR_CHAT_WITH_COMPONENT;
  context: SYMBOL_CMD_CONTEXT & GENERIC_CHAT_CONTEXT;
}
