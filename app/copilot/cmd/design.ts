import { CMD_BASE } from "./cmd_base";
import { CMD_TYPE } from "./cmd_type";

export interface DESIGN_CMD extends CMD_BASE {
  type: CMD_TYPE.DESIGN_INTENTION | CMD_TYPE.CORE_COMPONENTS;
}
