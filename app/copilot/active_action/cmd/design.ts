import { GENERIC_CHAT_CONTEXT } from "../../context";
import { CMD_BASE } from "./cmd_base";
import { CMD_TYPE } from "./cmd_type";

export interface DESIGN_CMD extends CMD_BASE {
  type: CMD_TYPE.DESIGN_INTENTION | CMD_TYPE.CORE_COMPONENTS;
}

export interface USR_CHAT_WITH_DESIGN_CMD extends CMD_BASE {
  type: CMD_TYPE.USR_CHAT_WITH_DESIGN;
  context: GENERIC_CHAT_CONTEXT;
}
