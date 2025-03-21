import { DESIGN_GLOBAL_CONTEXT } from "../context";

export interface CMD_BASE {
  type: unknown;
  global_context_uuid?: string;
  design_global_context?: DESIGN_GLOBAL_CONTEXT;
}
