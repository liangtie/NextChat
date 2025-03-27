import { CMD_BASE } from "./cmd_base";
import { CMD_TYPE } from "./cmd_type";
import { USR_CHAT_CMD_BASE } from "./generic_chat";

export interface DESIGN_CMD extends CMD_BASE {
  type: CMD_TYPE.DESIGN_INTENTION | CMD_TYPE.CORE_COMPONENTS;
}

export interface USR_CHAT_WITH_DESIGN_CMD extends CMD_BASE, USR_CHAT_CMD_BASE {
  type: CMD_TYPE.USR_CHAT_WITH_DESIGN;
}
