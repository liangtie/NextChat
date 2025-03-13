import { SYMBOL_CMD_CONTEXT } from "../context";
import { CMD_BASE } from "./cmd_base";
import { SYMBOL_CMD_TYPE } from "./cmd_type";

export interface SYMBOL_CMD extends CMD_BASE {
  type: SYMBOL_CMD_TYPE;
  context: SYMBOL_CMD_CONTEXT;
}
